// =====================================================
// 1. CẤU HÌNH MẶC ĐỊNH
// =====================================================

var DEFAULT_PRIZES = [
  { name: "Ưu đãi học phí 15%", weight: 5 },
  { name: "Tài liệu IELTS Vietop", weight: 12 },
  { name: "Học thử miễn phí", weight: 15 },
  { name: "Quà tặng Vietop", weight: 18 },
  { name: "Ưu đãi học phí 5%", weight: 12 },
  { name: "Test IELTS miễn phí", weight: 15 },
  { name: "Bộ đề thi IELTS", weight: 13 },
  { name: "Chúc bạn may mắn!", weight: 10 },
];

var STORE_KEY = "vietopLuckyWheel_v4";

// Kích thước và màu sắc giao diện vòng quay
var GAME_W = 560;
var GAME_H = 600;

// Tâm và bán kính vòng quay
var WHEEL_CX = 280;
var WHEEL_CY = 260;
var WHEEL_R = 228;

var WHEEL_STYLE = {
  background: "#eaf5ff",
  blue: 0x1b55b5,
  deepBlue: 0x113983,
  gold: 0xffc541,
  white: 0xffffff,
  labelBlue: "#112d72",
};

var prizes = [];

var game = null;
var sceneRef = null;
var wheel = null;
var wheelGraphics = null;
var wheelLabels = [];
var wheelLogo = null;
var prizeText = null;

var canSpin = true;
var currentPrize = -1;

var showLabels = true;
var showPct = false;

// =====================================================
// 2. LƯU VÀ TẢI CẤU HÌNH
// =====================================================

function loadConfig() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY));

    if (
      saved &&
      Array.isArray(saved.prizes) &&
      saved.prizes.length >= 2 &&
      saved.prizes.length <= 16
    ) {
      prizes = saved.prizes.map(function (p) {
        return {
          name: String(p.name || "Giải thưởng"),
          weight: Math.max(0, Number(p.weight) || 0),
        };
      });

      showLabels = saved.showLabels !== false;
      showPct = !!saved.showPct;

      return;
    }
  } catch (error) {
    console.error("Load config error:", error);
  }

  prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
}

function saveConfig() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        prizes: prizes,
        showLabels: showLabels,
        showPct: showPct,
      }),
    );
  } catch (error) {
    console.error("Save config error:", error);
  }
}

function totalWeight() {
  return prizes.reduce(function (sum, prize) {
    return sum + (Number(prize.weight) || 0);
  }, 0);
}

function setStatus(message) {
  document.querySelectorAll(".status").forEach(function (element) {
    element.textContent = message;
  });
}

// =====================================================
// 3. QUẢN LÝ BẢNG CẤU HÌNH
// =====================================================

function renderRows() {
  var tbody = document.getElementById("rows");

  tbody.textContent = "";

  prizes.forEach(function (prize, index) {
    var tr = document.createElement("tr");

    // Tên phần thưởng
    var nameCell = document.createElement("td");

    var nameInput = document.createElement("input");

    nameInput.value = prize.name;

    nameInput.addEventListener("input", function () {
      prize.name = nameInput.value;

      refreshWheel();
      saveConfig();
    });

    nameCell.appendChild(nameInput);

    // Trọng số
    var weightCell = document.createElement("td");

    var weightInput = document.createElement("input");

    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.step = "any";
    weightInput.className = "w";
    weightInput.value = prize.weight;

    weightInput.addEventListener("input", function () {
      prize.weight = Math.max(0, Number(weightInput.value) || 0);

      updatePercentages();

      refreshWheel();

      saveConfig();
    });

    weightCell.appendChild(weightInput);

    // Tỷ lệ
    var pctCell = document.createElement("td");

    pctCell.className = "pct";

    // Xóa phần thưởng
    var actionCell = document.createElement("td");

    var deleteButton = document.createElement("button");

    deleteButton.textContent = "✕";
    deleteButton.className = "del";

    deleteButton.addEventListener("click", function () {
      if (!canSpin) {
        return setStatus("Đang quay, vui lòng đợi.");
      }

      if (prizes.length <= 2) {
        return setStatus("Cần ít nhất 2 ô.");
      }

      prizes.splice(index, 1);

      renderRows();

      refreshWheel();

      saveConfig();
    });

    actionCell.appendChild(deleteButton);

    tr.append(nameCell, weightCell, pctCell, actionCell);

    tbody.appendChild(tr);
  });

  updatePercentages();
}

function updatePercentages() {
  var total = totalWeight();

  document.querySelectorAll("#rows .pct").forEach(function (cell, index) {
    var percent = total > 0 ? (prizes[index].weight / total) * 100 : 0;

    cell.textContent = percent.toFixed(1) + "%";
  });
}

function syncOptions() {
  document.getElementById("optLabels").checked = showLabels;

  document.getElementById("optPct").checked = showPct;
}

// =====================================================
// 4. XỬ LÝ CHUYỂN GIAO DIỆN
// =====================================================

// Cập nhật kích thước Phaser sau khi giao diện xuất hiện
function refreshGameLayout() {
  if (!game) return;

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (!game || !game.scale) return;

      game.scale.refresh();

      game.scale.updateBounds();
    });
  });
}

function showView(name) {
  var config = name === "config";

  var wheelView = document.getElementById("viewWheel");

  var panelView = document.getElementById("viewPanel");

  wheelView.classList.toggle("hidden", config);

  panelView.classList.toggle("hidden", !config);

  setStatus("");

  var hash = config ? "#config" : "#wheel";

  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }

  // Chỉ cập nhật kích thước, không tạo lại game
  if (!config) {
    refreshGameLayout();
  }
}

function viewFromHash() {
  var config = location.hash === "#config";

  document.getElementById("viewWheel").classList.toggle("hidden", config);

  document.getElementById("viewPanel").classList.toggle("hidden", !config);

  if (!config) {
    refreshGameLayout();
  }
}

// =====================================================
// 5. XỬ LÝ CÁC NÚT CẤU HÌNH
// =====================================================

function bindPanel() {
  // Thêm phần thưởng
  document.getElementById("add").onclick = function () {
    if (!canSpin) {
      return setStatus("Đang quay, vui lòng đợi.");
    }

    if (prizes.length >= 16) {
      return setStatus("Tối đa 16 ô.");
    }

    prizes.push({
      name: "Giải mới",
      weight: 5,
    });

    renderRows();

    refreshWheel();

    saveConfig();
  };

  // Áp dụng
  function applyConfig() {
    if (!canSpin) {
      return setStatus("Đang quay, vui lòng đợi.");
    }

    if (totalWeight() <= 0) {
      return setStatus("Tổng trọng số phải lớn hơn 0.");
    }

    saveConfig();

    refreshWheel();

    setStatus("Đã áp dụng cấu hình.");

    return true;
  }

  document.getElementById("apply").onclick = applyConfig;

  // Áp dụng và quay lại
  document.getElementById("applyBack").onclick = function () {
    if (applyConfig()) {
      showView("wheel");
    }
  };

  // Hiện tên giải
  document.getElementById("optLabels").onchange = function () {
    showLabels = this.checked;

    saveConfig();

    refreshWheel();
  };

  // Hiện tỷ lệ
  document.getElementById("optPct").onchange = function () {
    showPct = this.checked;

    saveConfig();

    refreshWheel();
  };

  // Chuyển sang cấu hình
  document.getElementById("toConfig").onclick = function () {
    showView("config");
  };

  // Quay lại vòng quay
  document.getElementById("toWheel").onclick = function () {
    showView("wheel");
  };

  // Khôi phục mặc định
  document.getElementById("reset").onclick = function () {
    if (!canSpin) {
      return setStatus("Đang quay, vui lòng đợi.");
    }

    prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));

    showLabels = true;
    showPct = false;

    syncOptions();

    renderRows();

    saveConfig();

    refreshWheel();

    setStatus("Đã khôi phục cấu hình mặc định.");
  };
}

// =====================================================
// 6. CHỌN GIẢI THEO TRỌNG SỐ
// =====================================================

function pickPrizeIndex() {
  var total = totalWeight();

  var random = Math.random() * total;

  var accumulated = 0;

  for (var i = 0; i < prizes.length; i++) {
    accumulated += Number(prizes[i].weight) || 0;

    if (random < accumulated) {
      return i;
    }
  }

  return prizes.length - 1;
}

// =====================================================
// 7. LƯU KẾT QUẢ VÀ XUẤT EXCEL
// =====================================================

var RESULTS_KEY = "vietopLuckyWheelResults_v1";
var results = []; // [{time, player, prize, slice}] theo thứ tự quay

function loadResults() {
  try {
    var saved = JSON.parse(localStorage.getItem(RESULTS_KEY));

    if (Array.isArray(saved)) {
      results = saved.map(function (r) {
        return {
          time: String(r.time || ""),
          player: String(r.player || "Ẩn danh"),
          prize: String(r.prize || ""),
          slice: Number(r.slice) || "",
        };
      });
    }
  } catch (error) {
    console.error("Load results error:", error);
  }
}

function saveResults() {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error("Save results error:", error);
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// dd/mm/yyyy hh:mm:ss
function formatDateTime(d) {
  return (
    pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear() +
    " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds())
  );
}

// Danh sách chỉ hiện sau khi có ít nhất một lượt quay; mới nhất ở trên cùng.
function renderResults() {
  var box = document.getElementById("winners");
  var log = document.getElementById("log");

  log.textContent = "";
  box.classList.toggle("hidden", results.length === 0);
  document.getElementById("winnersCount").textContent = results.length;

  for (var i = results.length - 1; i >= 0; i--) {
    var r = results[i];

    var li = document.createElement("li");

    var name = document.createElement("span");
    name.className = "winner-name";
    name.textContent = r.player;

    var prize = document.createElement("span");
    prize.className = "winner-prize";
    prize.textContent = r.prize;

    var time = document.createElement("span");
    time.className = "winner-time";
    time.textContent = r.time;

    li.append(name, document.createTextNode(" — "), prize, time);
    log.appendChild(li);
  }
}

function csvCell(value) {
  var text = String(value);

  // tránh Excel hiểu nhầm là công thức
  if (/^[=+\-@]/.test(text)) text = "'" + text;

  return '"' + text.replace(/"/g, '""') + '"';
}

function downloadBlob(blob, fileName) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function exportResults() {
  if (results.length === 0) {
    return setStatus("Chưa có lượt quay nào để xuất.");
  }

  var now = new Date();
  var stamp =
    now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) +
    "-" + pad2(now.getHours()) + pad2(now.getMinutes());

  var rows = [["STT", "Thời gian", "Tên người chơi", "Phần thưởng"]];

  results.forEach(function (r, index) {
    rows.push([index + 1, r.time, r.player, r.prize]);
  });

  // Ưu tiên file .xlsx (thư viện SheetJS tải từ CDN)
  if (window.XLSX) {
    var sheet = XLSX.utils.aoa_to_sheet(rows);

    sheet["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 36 }];

    var book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(book, sheet, "Kết quả");

    var fileName = "ket-qua-vong-quay-vietop-" + stamp + ".xlsx";

    XLSX.writeFile(book, fileName);

    return setStatus("Đã xuất file " + fileName);
  }

  // Dự phòng khi không tải được thư viện (mất mạng): xuất CSV, Excel vẫn mở được.
  var csv = "\uFEFF" + rows.map(function (row) {
    return row.map(csvCell).join(",");
  }).join("\r\n");

  var csvName = "ket-qua-vong-quay-vietop-" + stamp + ".csv";

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), csvName);

  setStatus("Không tải được thư viện Excel nên đã xuất " + csvName + " (mở bằng Excel được).");
}

function clearResults() {
  if (results.length === 0) return;

  var ok = window.confirm(
    "Xoá toàn bộ " + results.length + " kết quả? Hãy xuất Excel trước nếu cần lưu lại.",
  );

  if (!ok) return;

  results = [];
  saveResults();
  renderResults();
  setStatus("Đã xoá danh sách trúng thưởng.");
}

// =====================================================
// 8. PHASER GAME
// =====================================================

class PlayGame extends Phaser.Scene {
  constructor() {
    super("PlayGame");
  }

  preload() {
    // Không dùng ảnh logo bên ngoài để có thể chạy ngay khi mở index.html.
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    sceneRef = this;

    // Graphics dùng để vẽ vòng quay động
    wheelGraphics = this.add.graphics();

    wheel = this.add.container(WHEEL_CX, WHEEL_CY, [wheelGraphics]);

    this.drawHub();

    // Kim chỉ
    this.drawPointer();

    // Wordmark Vietop bằng chữ, không phụ thuộc logo.png bên ngoài.
    wheelLogo = this.add.text(WHEEL_CX, WHEEL_CY, "Vietop", {
      fontFamily: "Nunito, Arial, sans-serif",
      fontSize: "27px",
      fontStyle: "bold italic",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5).setDepth(20);

    // Hiển thị kết quả
    prizeText = this.add
      .text(WHEEL_CX, 535, "", {
        fontFamily: "Arial",
        fontSize: "22px",
        fontStyle: "bold",
        color: WHEEL_STYLE.labelBlue,
        align: "center",
        wordWrap: {
          width: 500,
        },
      })
      .setOrigin(0.5);

    // Hướng dẫn
    this.add
      .text(WHEEL_CX, 582, "CHẠM VÀO VÒNG QUAY HOẶC NHẤN QUAY NGAY", {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: WHEEL_STYLE.deepBlue,
      })
      .setOrigin(0.5);

    // Vẽ vòng quay ban đầu
    refreshWheel();

    canSpin = true;

    // Bắt sự kiện click
    this.input.on("pointerdown", this.spin, this);
  }

  // ---------------------------------------------------
  // VẼ TÂM VÒNG QUAY
  // ---------------------------------------------------

  drawHub() {
    var hub = this.add.graphics();

    hub.fillStyle(0x87b9f3, 1);
    hub.fillCircle(WHEEL_CX, WHEEL_CY, 61);
    hub.fillStyle(WHEEL_STYLE.white, 1);
    hub.fillCircle(WHEEL_CX, WHEEL_CY, 55);
    hub.fillStyle(0x1553bc, 1);
    hub.fillCircle(WHEEL_CX, WHEEL_CY, 50);

    hub.setDepth(15);
  }

  // ---------------------------------------------------
  // VẼ KIM
  // ---------------------------------------------------

  drawPointer() {
    var pointer = this.add.graphics();

    pointer.fillStyle(0xffc33d, 1);
    pointer.lineStyle(4, 0xffe9a1, 1);
    pointer.fillTriangle(WHEEL_CX, 49, WHEEL_CX - 22, 7, WHEEL_CX + 22, 7);
    pointer.strokeTriangle(WHEEL_CX, 49, WHEEL_CX - 22, 7, WHEEL_CX + 22, 7);
    pointer.fillStyle(0xffda72, 1);
    pointer.fillCircle(WHEEL_CX, 11, 17);
    pointer.fillStyle(0xfff1b0, 1);
    pointer.fillCircle(WHEEL_CX, 11, 9);

    pointer.setDepth(10);
  }

  // ---------------------------------------------------
  // VẼ CÁC Ô VÒNG QUAY
  // ---------------------------------------------------

  drawWheel() {
    if (!wheelGraphics) return;

    wheelGraphics.clear();

    var count = prizes.length;

    if (count < 2) return;

    var step = (Math.PI * 2) / count;

    // Ô số 1 nằm chính giữa vị trí 12 giờ, khớp kim chỉ phía trên.
    var start = -Math.PI / 2 - step / 2;

    for (var i = 0; i < count; i++) {
      var a0 = start + i * step;

      var a1 = a0 + step;

      var points = [{ x: 0, y: 0 }];

      var segments = Math.max(12, Math.ceil(48 / count));

      for (var j = 0; j <= segments; j++) {
        var angle = a0 + ((a1 - a0) * j) / segments;

        points.push({
          x: Math.cos(angle) * WHEEL_R,
          y: Math.sin(angle) * WHEEL_R,
        });
      }

      var pastelColors = [
        0xffe6a5, 0xd5eaff, 0xfffbef, 0xcce5ff,
        0xffe7ad, 0xd6eafe, 0xfffaf1, 0xcfe6ff,
      ];
      var sliceColor = count === 8 ? pastelColors[i] : (i % 2 === 0 ? 0xd7eaff : 0xfff7e7);
      wheelGraphics.fillStyle(sliceColor, 1);

      wheelGraphics.fillPoints(points, true);

      // Đường phân cách
      wheelGraphics.lineStyle(
        3,
        0xffffff,
        1,
      );

      wheelGraphics.strokePoints(points, true);
    }

    // Vành ngoài hai lớp và đèn vàng kiểu game show Vietop.
    wheelGraphics.lineStyle(22, 0x2668c8, 1);
    wheelGraphics.strokeCircle(0, 0, WHEEL_R + 1);
    wheelGraphics.lineStyle(4, 0x5da0ed, 1);
    wheelGraphics.strokeCircle(0, 0, WHEEL_R + 12);
    wheelGraphics.lineStyle(3, WHEEL_STYLE.white, .9);
    wheelGraphics.strokeCircle(0, 0, WHEEL_R - 9);

    var bulbCount = 28;
    for (var tick = 0; tick < bulbCount; tick++) {
      var tickAngle = start + tick * Math.PI * 2 / bulbCount;
      wheelGraphics.fillStyle(0xffe7a6, .35);
      wheelGraphics.fillCircle(
        Math.cos(tickAngle) * (WHEEL_R + 1),
        Math.sin(tickAngle) * (WHEEL_R + 1), 10);
      wheelGraphics.fillStyle(0xffd34a, 1);
      wheelGraphics.fillCircle(
        Math.cos(tickAngle) * (WHEEL_R + 1),
        Math.sin(tickAngle) * (WHEEL_R + 1), 5.3);
    }
  }

  // ---------------------------------------------------
  // QUAY VÒNG QUAY
  // ---------------------------------------------------

  spin() {
    if (!canSpin) return;

    if (totalWeight() <= 0) {
      return setStatus("Tổng trọng số phải lớn hơn 0.");
    }

    if (prizes.length < 2) return;

    prizeText.setText("");
    setStatus("");
    document.getElementById("resultCard").classList.add("hidden");
    document.getElementById("spinButton").disabled = true;
    document.getElementById("spinButton").classList.add("is-spinning");

    canSpin = false;

    var count = prizes.length;

    var sliceAngle = 360 / count;

    // Chọn giải theo trọng số
    currentPrize = pickPrizeIndex();

    // Ô i có tâm ở góc i*sliceAngle tính từ vị trí 12 giờ.
    // Thêm sai lệch nhỏ để kim không dừng tại cùng một điểm.
    var insideSliceOffset = (Math.random() - 0.5) * sliceAngle * 0.7;
    var targetAngle = currentPrize * sliceAngle + insideSliceOffset;
    var desiredWheelAngle = ((360 - targetAngle) % 360 + 360) % 360;

    var currentRawAngle = wheel.angle;
    var currentAngle = ((currentRawAngle % 360) + 360) % 360;

    var delta = (desiredWheelAngle - currentAngle + 360) % 360;

    var rounds = Phaser.Math.Between(4, 6);

    this.tweens.add({
      targets: wheel,

      // Cộng vòng quay vào góc hiện tại để các lượt thứ 2, 3... vẫn quay đủ vòng.
      angle: currentRawAngle + 360 * rounds + delta,

      duration: 4200,

      ease: "Cubic.easeOut",

      onComplete: this.winPrize,

      onCompleteScope: this,
    });
  }

  // ---------------------------------------------------
  // KẾT THÚC VÒNG QUAY
  // ---------------------------------------------------

  winPrize() {
    canSpin = true;
    document.getElementById("spinButton").disabled = false;
    document.getElementById("spinButton").classList.remove("is-spinning");

    var selected = prizes[currentPrize];

    if (!selected) return;

    prizeText.setText("🎉 " + selected.name);
    document.getElementById("resultName").textContent = selected.name;
    document.getElementById("resultCard").classList.remove("hidden");

    results.push({
      time: formatDateTime(new Date()),

      player: document.getElementById("player").value.trim() || "Ẩn danh",

      prize: selected.name,

      slice: currentPrize + 1,
    });

    saveResults();

    renderResults();
  }
}

// =====================================================
// 9. CẬP NHẬT VÒNG QUAY VÀ NHÃN
// =====================================================

function refreshWheel() {
  if (!sceneRef || !wheel) return;

  if (!canSpin) return;

  // Đưa vòng quay về góc ban đầu
  wheel.setAngle(0);

  // Vẽ lại số lượng ô theo dữ liệu
  sceneRef.drawWheel();

  // Xóa nhãn cũ
  wheelLabels.forEach(function (label) {
    label.destroy();
  });

  wheelLabels = [];

  if (!showLabels) return;

  var count = prizes.length;

  var step = (Math.PI * 2) / count;

  var total = totalWeight();

  var radius = WHEEL_R * (count > 10 ? 0.62 : 0.64);

  var fontSize = count > 12 ? 10 : count > 9 ? 11 : count > 7 ? 13 : 15;

  // Vẽ nhãn từng phần thưởng
  for (var i = 0; i < count; i++) {
    var middle = -Math.PI / 2 + i * step;

    var label = prizes[i].name;

    // Hiện tỷ lệ %
    if (showPct) {
      var percent =
        total > 0 ? ((prizes[i].weight / total) * 100).toFixed(1) : "0.0";

      label += "\n" + percent + "%";
    }

    var text = sceneRef.add
      .text(
        Math.cos(middle) * radius,

        Math.sin(middle) * radius,

        label,

        {
          fontFamily: "Arial",

          fontSize: fontSize + "px",

          fontStyle: "bold",

          color: WHEEL_STYLE.labelBlue,

          stroke: "#ffffff",

          strokeThickness: 1,

          align: "center",

          wordWrap: {
            width: count > 10 ? 55 : count > 8 ? 78 : 103,
          },
        },
      )
      .setOrigin(0.5);

    // Để nhãn thẳng đứng, dễ đọc như mẫu thiết kế.
    wheel.add(text);
    wheelLabels.push(text);

    // Biểu tượng tặng quà đặt gần vành ngoài của mỗi ô.
    if (count <= 10) {
      var icon = getPrizeIcon(prizes[i].name);
      var symbol = sceneRef.add.text(
        Math.cos(middle) * WHEEL_R * 0.84,
        Math.sin(middle) * WHEEL_R * 0.84,
        icon,
        { fontFamily: "Arial, sans-serif", fontSize: count > 8 ? "20px" : "25px", align: "center" }
      ).setOrigin(0.5);
      wheel.add(symbol);
      wheelLabels.push(symbol);
    }
  }
}


// Biểu tượng minh họa cho từng loại quà, chỉ ảnh hưởng giao diện.
function getPrizeIcon(name) {
  var n = String(name).toLowerCase();
  if (n.includes("15%") || n.includes("50%")) return "👑";
  if (n.includes("học phí") || n.includes("ưu đãi")) return "🎟️";
  if (n.includes("tài liệu")) return "📚";
  if (n.includes("học thử")) return "🎧";
  if (n.includes("quà") || n.includes("sổ tay") || n.includes("móc khóa")) return "🎁";
  if (n.includes("test") || n.includes("kiểm tra")) return "📋";
  if (n.includes("bộ đề") || n.includes("đề thi")) return "📖";
  if (n.includes("may mắn") || n.includes("trượt")) return "😊";
  return "✨";
}

// =====================================================
// 10. KHỞI TẠO GAME
// =====================================================

window.addEventListener("load", function () {
  loadConfig();

  // Khôi phục danh sách trúng thưởng đã lưu
  loadResults();

  renderResults();

  syncOptions();

  renderRows();

  bindPanel();

  // Điều khiển ngoài canvas, như giao diện thiết kế.
  document.getElementById("spinButton").addEventListener("click", function () {
    if (sceneRef && canSpin) sceneRef.spin();
  });
  document.getElementById("closeModal").addEventListener("click", function () {
    document.body.classList.add("is-dismissed");
  });
  document.getElementById("openModal").addEventListener("click", function () {
    document.body.classList.remove("is-dismissed");
    refreshGameLayout();
  });

  document.getElementById("exportBtn").addEventListener("click", exportResults);
  document.getElementById("clearBtn").addEventListener("click", clearResults);

  window.addEventListener("hashchange", viewFromHash);

  // Hiển thị giao diện ban đầu
  viewFromHash();

  // Chỉ khởi tạo Phaser đúng MỘT LẦN
  game = new Phaser.Game({
    type: Phaser.AUTO,

    width: GAME_W,

    height: GAME_H,

    parent: "game",

    // Render sắc nét hơn trên màn hình có mật độ điểm ảnh cao.
    // Giới hạn 2x để tránh tiêu tốn quá nhiều bộ nhớ trên thiết bị yếu.
    resolution: Math.min(window.devicePixelRatio || 1, 2),

    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },

    scene: [PlayGame],

    backgroundColor: "rgba(0,0,0,0)",
    transparent: true,

    scale: {
      mode: Phaser.Scale.FIT,

      autoCenter: Phaser.Scale.CENTER_BOTH,

      width: GAME_W,

      height: GAME_H,
    },
  });

  // Cập nhật lại kích thước khi cửa sổ thay đổi
  window.addEventListener("resize", function () {
    refreshGameLayout();
  });
});
