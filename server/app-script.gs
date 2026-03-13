/**
 * Google Apps Script backend for "Bữa sáng ngẫu nhiên"
 *
 * Hướng dẫn sử dụng nhanh:
 * 1. Mở Google Sheet bạn dùng để lưu món ăn.
 * 2. Extensions → Apps Script → tạo / mở project.
 * 3. Copy toàn bộ nội dung file này, dán vào Code.gs (hoặc file bất kỳ trong project).
 * 4. Đổi giá trị SHEET_ID và SHEET_NAME cho đúng.
 * 5. Trong sheet, hàng 1 phải là header:
 *    id | title | description | address | priceMin | priceMax | createdAt | updatedAt
 * 6. Deploy → New deployment → Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Lấy URL Web app, dán vào hằng số API_BASE_URL trong js/app.js.
 */

/** CONFIG **/
const SHEET_ID = "1Km2iIQ3lRt9q9Spnxpz6gfJBRDIkBeuRgQr_fD3fuww";
const SHEET_NAME = "Foods"; // Đổi nếu bạn dùng tên sheet khác

// Header chuẩn cho sheet Foods; nếu thiếu sẽ được tạo tự động.
const HEADERS = [
  "id",
  "title",
  "description",
  "address",
  "priceMin",
  "priceMax",
  "createdAt",
  "updatedAt",
];

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Nếu chưa có sheet, tự tạo
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Đảm bảo có header đúng định dạng ở dòng 1
  const lastCol = sheet.getLastColumn();
  let currentHeaders = [];
  if (lastCol > 0) {
    currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const headerRowEmpty = currentHeaders.join("").trim() === "";
  const headerCountMismatch = currentHeaders.length !== HEADERS.length;

  // Nếu dòng 1 trống hoặc số cột không khớp, reset lại header chuẩn
  if (headerRowEmpty || headerCountMismatch) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

/**
 * Trả JSON kèm CORS đơn giản (cho phép frontend fetch từ domain khác).
 * Lưu ý: với Web Apps Script, không set header trực tiếp trên TextOutput,
 * nên ta encode status vào JSON.
 */
function jsonResponse_(payload) {
  return ContentService.createTextOutput(
    JSON.stringify(payload || {}),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return jsonResponse_({ ok: true });
}

/**
 * Entry GET:
 *   GET ?action=list
 */
function doGet(e) {
  const action = (e.parameter.action || "list").toLowerCase();
  if (action === "list") {
    return listFoods_();
  }
  return jsonResponse_({ ok: false, error: "Unsupported GET action" });
}

/**
 * Entry POST:
 *   body JSON: { action: 'create' | 'update' | 'delete', ... }
 */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(
      e.postData && e.postData.contents ? e.postData.contents : "{}",
    );
  } catch (err) {
    return jsonResponse_({ ok: false, error: "Invalid JSON: " + err });
  }

  const action = (data.action || "").toLowerCase();
  if (!action) {
    return jsonResponse_({ ok: false, error: "Missing action" });
  }

  if (action === "create") return createFood_(data);
  if (action === "update") return updateFood_(data);
  if (action === "delete") return deleteFood_(data);

  return jsonResponse_({ ok: false, error: "Unsupported POST action" });
}

/** BUSINESS LOGIC **/

function listFoods_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonResponse_({ ok: true, data: [] });
  }

  const headers = values[0];
  const rows = values.slice(1);

  const data = rows
    .filter(function (row) {
      return row.join("").trim() !== "";
    })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = row[i];
      });
      // Ép priceMin, priceMax về dạng số (nếu có)
      if (obj.priceMin !== "" && obj.priceMin != null) {
        obj.priceMin = Number(obj.priceMin);
      }
      if (obj.priceMax !== "" && obj.priceMax != null) {
        obj.priceMax = Number(obj.priceMax);
      }
      return obj;
    });

  return jsonResponse_({ ok: true, data: data });
}

function createFood_(data) {
  // Validate đơn giản phía server
  if (!data.title || String(data.title).trim() === "") {
    return jsonResponse_({ ok: false, error: "Missing field: title" });
  }

  const sheet = getSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const now = new Date().toISOString();
  var id =
    data.id ||
    "food-" +
      new Date().getTime().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

  const rowObj = {
    id: id,
    title: data.title,
    description: data.description || "",
    address: data.address || "",
    priceMin: data.priceMin || "",
    priceMax: data.priceMax || "",
    createdAt: now,
    updatedAt: now,
  };

  const row = headers.map(function (h) {
    return rowObj[h] !== undefined ? rowObj[h] : "";
  });

  // Giới hạn tối đa 100 món (không tính hàng header)
  var totalRows = sheet.getLastRow();
  var dataRows = Math.max(0, totalRows - 1); // trừ header
  if (dataRows >= 100) {
    // Xoá dòng dữ liệu đầu tiên (row 2) rồi append món mới ở cuối
    sheet.deleteRow(2);
  }

  sheet.appendRow(row);

  return jsonResponse_({ ok: true, data: rowObj });
}

function updateFood_(data) {
  if (!data.id) {
    return jsonResponse_({ ok: false, error: "Missing id" });
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonResponse_({ ok: false, error: "No data" });
  }

  const headers = values[0];
  const idColIndex = headers.indexOf("id");
  if (idColIndex === -1) {
    return jsonResponse_({ ok: false, error: "Sheet missing id column" });
  }

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idColIndex]) === String(data.id)) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse_({ ok: false, error: "Food not found" });
  }

  const rowRange = sheet.getRange(rowIndex, 1, 1, headers.length);
  const rowValues = rowRange.getValues()[0];
  const rowObj = {};
  headers.forEach(function (h, i) {
    rowObj[h] = rowValues[i];
  });

  // Cập nhật các field cho phép
  ["title", "description", "address", "priceMin", "priceMax"].forEach(
    function (key) {
      if (data[key] !== undefined) {
        rowObj[key] = data[key];
      }
    },
  );

  rowObj.updatedAt = new Date().toISOString();

  const newRow = headers.map(function (h) {
    return rowObj[h] !== undefined ? rowObj[h] : "";
  });
  rowRange.setValues([newRow]);

  return jsonResponse_({ ok: true, data: rowObj });
}

function deleteFood_(data) {
  if (!data.id) {
    return jsonResponse_({ ok: false, error: "Missing id" });
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonResponse_({ ok: false, error: "No data" });
  }

  const headers = values[0];
  const idColIndex = headers.indexOf("id");
  if (idColIndex === -1) {
    return jsonResponse_({ ok: false, error: "Sheet missing id column" });
  }

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idColIndex]) === String(data.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse_({ ok: false, error: "Food not found" });
  }

  sheet.deleteRow(rowIndex);
  return jsonResponse_({ ok: true });
}
