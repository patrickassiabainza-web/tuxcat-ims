const $ = (sel) => document.querySelector(sel);

const inventoryForm = $("#inventoryForm");
const orderForm = $("#orderForm");

const itemNameInput = $("#itemName");
const itemStockInput = $("#itemStock");
const itemThresholdInput = $("#itemThreshold");
const itemPriceInput = $("#itemPrice");

const invSearch = $("#invSearch");
const invSort = $("#invSort");
const invOnlyLow = $("#invOnlyLow");

const orderItemInput = $("#orderItem");
const orderQtyInput = $("#orderQty");
const orderSearch = $("#orderSearch");
const orderFilter = $("#orderFilter");
const itemSuggestions = $("#itemSuggestions");

const inventoryList = $("#inventoryList");
const orderList = $("#orderList");

const statItems = $("#statItems");
const statLowStock = $("#statLowStock");
const statOrders = $("#statOrders");
const statPending = $("#statPending");
const statDelivered = $("#statDelivered");
const lowStockAlerts = $("#lowStockAlerts");

const salesBody = $("#salesBody");
const salesSearch = $("#salesSearch");
const btnExportSales = $("#btnExportSales");

const btnExportAll = $("#btnExportAll");
const csvImport = $("#csvImport");
const btnReset = $("#btnReset");

const toast = $("#toast");

// modal
const editModal = $("#editModal");
const btnCloseModal = $("#btnCloseModal");
const btnCancelEdit = $("#btnCancelEdit");
const editForm = $("#editForm");
const editKey = $("#editKey");
const editName = $("#editName");
const editStock = $("#editStock");
const editThreshold = $("#editThreshold");
const editPrice = $("#editPrice");

// ========= DATA =========
let inventory = load("inventory", []);
let orders = load("orders", []);

/**
 * Inventory item shape:
 * { key, displayName, stock, threshold, price }
 *
 * Order shape:
 * { id, itemKey, itemName, qty, status, createdAt }
 */

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
}

function saveAll() {
  save("inventory", inventory);
  save("orders", orders);
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function money(n) {
  if (typeof n !== "number" || !isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========= INVENTORY =========
inventoryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const nameRaw = itemNameInput.value.trim();
  const key = normalizeName(nameRaw);

  const addStock = Number(itemStockInput.value);
  const threshold = Number(itemThresholdInput.value ?? 5);
  const priceRaw = itemPriceInput.value.trim();
  const price = priceRaw === "" ? null : Number(priceRaw);

  if (!key) return showToast("Enter an item name.");
  if (!Number.isInteger(addStock) || addStock <= 0) return showToast("Stock must be a whole number greater than 0.");
  if (!Number.isInteger(threshold) || threshold < 0) return showToast("Threshold must be 0 or more.");
  if (price !== null && (!isFinite(price) || price < 0)) return showToast("Price must be 0 or more.");

  const existing = inventory.find(i => i.key === key);

  if (existing) {
    existing.displayName = nameRaw;
    existing.stock += addStock;
    existing.threshold = threshold;
    existing.price = price;
    showToast(`Updated: ${nameRaw} (+${addStock} stock)`);
  } else {
    inventory.push({
      key,
      displayName: nameRaw,
      stock: addStock,
      threshold,
      price
    });
    showToast(`Added: ${nameRaw}`);
  }

  itemNameInput.value = "";
  itemStockInput.value = "";
  itemPriceInput.value = "";
  itemNameInput.focus();

  saveAll();
  renderAll();
});

function removeItem(itemKey) {
  const item = inventory.find(i => i.key === itemKey);
  if (!item) return;

  const ok = confirm(`Remove "${item.displayName}" from inventory?`);
  if (!ok) return;

  // Optional: keep orders but item may not exist later
  inventory = inventory.filter(i => i.key !== itemKey);

  saveAll();
  renderAll();
  showToast("Item removed.");
}

function openEdit(itemKey) {
  const item = inventory.find(i => i.key === itemKey);
  if (!item) return;

  editKey.value = item.key;
  editName.value = item.displayName;
  editStock.value = item.stock;
  editThreshold.value = item.threshold ?? 5;
  editPrice.value = item.price ?? "";

  editModal.classList.add("show");
  editModal.setAttribute("aria-hidden", "false");
  editName.focus();
}

function closeEdit() {
  editModal.classList.remove("show");
  editModal.setAttribute("aria-hidden", "true");
}

btnCloseModal.addEventListener("click", closeEdit);
btnCancelEdit.addEventListener("click", closeEdit);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEdit();
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const oldKey = editKey.value;
  const nameRaw = editName.value.trim();
  const newKey = normalizeName(nameRaw);

  const stock = Number(editStock.value);
  const threshold = Number(editThreshold.value);
  const priceRaw = editPrice.value.trim();
  const price = priceRaw === "" ? null : Number(priceRaw);

  if (!newKey) return showToast("Item name cannot be empty.");
  if (!Number.isInteger(stock) || stock < 0) return showToast("Stock must be 0 or more.");
  if (!Number.isInteger(threshold) || threshold < 0) return showToast("Threshold must be 0 or more.");
  if (price !== null && (!isFinite(price) || price < 0)) return showToast("Price must be 0 or more.");

  const item = inventory.find(i => i.key === oldKey);
  if (!item) return;

  // If renamed to a different key that already exists, prevent collisions
  if (newKey !== oldKey && inventory.some(i => i.key === newKey)) {
    return showToast("That item name already exists. Choose a different name.");
  }

  // Update item
  item.key = newKey;
  item.displayName = nameRaw;
  item.stock = stock;
  item.threshold = threshold;
  item.price = price;

  // Update orders that reference it
  orders.forEach(o => {
    if (o.itemKey === oldKey) {
      o.itemKey = newKey;
      o.itemName = nameRaw;
    }
  });

  saveAll();
  renderAll();
  closeEdit();
  showToast("Item updated.");
});

// ========= ORDERS =========
orderForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const itemKey = normalizeName(orderItemInput.value);
  const qty = Number(orderQtyInput.value);

  if (!itemKey) return showToast("Enter an item.");
  if (!Number.isInteger(qty) || qty <= 0) return showToast("Quantity must be a whole number greater than 0.");

  const item = inventory.find(i => i.key === itemKey);
  if (!item) return showToast("Item not found in inventory.");

  if (item.stock < qty) return showToast(`Insufficient stock. Available: ${item.stock}`);

  item.stock -= qty;

  const order = {
    id: crypto.randomUUID(),
    itemKey,
    itemName: item.displayName,
    qty,
    status: "Pending",
    createdAt: Date.now()
  };

  orders.unshift(order);

  orderItemInput.value = "";
  orderQtyInput.value = "";
  orderItemInput.focus();

  saveAll();
  renderAll();
  showToast(`Order placed: ${order.itemName} x${qty}`);
});

function toggleDelivered(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = (order.status === "Delivered") ? "Pending" : "Delivered";
  saveAll();
  renderAll();
}

function cancelOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const ok = confirm(`Cancel order "${order.itemName} x${order.qty}"? Stock will be returned.`);
  if (!ok) return;

  const item = inventory.find(i => i.key === order.itemKey);
  if (item) item.stock += order.qty; // restore stock if item still exists

  orders = orders.filter(o => o.id !== orderId);

  saveAll();
  renderAll();
  showToast("Order cancelled.");
}

// ========= FILTERS =========
invSearch.addEventListener("input", renderAll);
invSort.addEventListener("change", renderAll);
invOnlyLow.addEventListener("change", renderAll);

orderSearch.addEventListener("input", renderAll);
orderFilter.addEventListener("change", renderAll);

salesSearch.addEventListener("input", renderAll);

// ========= CSV EXPORT/IMPORT =========
btnExportAll.addEventListener("click", () => {
  const invCsv = exportInventoryCSV();
  const ordCsv = exportOrdersCSV();
  const salesCsv = exportSalesCSV();

  downloadText(invCsv, "tuxcat_inventory.csv");
  downloadText(ordCsv, "tuxcat_inventory.csv");
  downloadText(salesCsv, "tuxcat_inventory.csv");

  showToast("Exported CSV files.");
});

btnExportSales.addEventListener("click", () => {
  downloadText(exportSalesCSV(), "bpal_sales.csv");
  showToast("Sales CSV exported.");
});

csvImport.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = parseInventoryCSV(text);

    if (imported.length === 0) {
      showToast("No valid rows found in CSV.");
      return;
    }

    // Merge import: if exists, update displayName/threshold/price and add stock
    imported.forEach(row => {
      const existing = inventory.find(i => i.key === row.key);
      if (existing) {
        existing.displayName = row.displayName;
        existing.stock += row.stock;
        existing.threshold = row.threshold;
        existing.price = row.price;
      } else {
        inventory.push(row);
      }
    });

    saveAll();
    renderAll();
    showToast(`Imported ${imported.length} items (stock added/merged).`);
  } catch {
    showToast("Import failed. Please check your CSV format.");
  } finally {
    csvImport.value = "";
  }
});

btnReset.addEventListener("click", () => {
  const ok = confirm("Reset all data? This will clear inventory and orders.");
  if (!ok) return;

  inventory = [];
  orders = [];
  saveAll();
  renderAll();
  showToast("Data reset.");
});

function exportInventoryCSV() {
  const header = ["name", "stock", "threshold", "price"];
  const rows = inventory.map(i => [
    i.displayName,
    i.stock,
    i.threshold ?? 5,
    (i.price ?? "")
  ]);

  return toCSV([header, ...rows]);
}

function exportOrdersCSV() {
  const header = ["date", "item", "qty", "status"];
  const rows = orders.map(o => [
    new Date(o.createdAt).toISOString(),
    o.itemName,
    o.qty,
    o.status
  ]);
  return toCSV([header, ...rows]);
}

function exportSalesCSV() {
  const sales = computeSales();
  const header = ["item", "units_sold", "est_revenue"];
  const rows = sales.map(s => [
    s.itemName,
    s.units,
    s.revenue === null ? "" : money(s.revenue)
  ]);
  return toCSV([header, ...rows]);
}

function toCSV(matrix) {
  return matrix
    .map(row => row.map(cell => {
      const v = String(cell ?? "");
      const escaped = v.replaceAll('"', '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(","))
    .join("\n");
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseInventoryCSV(text) {
  // Expected headers: name,stock,threshold,price (case-insensitive)
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const header = splitCSVLine(lines[0]).map(h => normalizeName(h));
  const idxName = header.indexOf("name");
  const idxStock = header.indexOf("stock");
  const idxThreshold = header.indexOf("threshold");
  const idxPrice = header.indexOf("price");

  if (idxName === -1 || idxStock === -1) return [];

  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const nameRaw = (cols[idxName] ?? "").trim();
    const key = normalizeName(nameRaw);

    const stock = Number(cols[idxStock]);
    const threshold = idxThreshold >= 0 ? Number(cols[idxThreshold]) : 5;
    const price = (idxPrice >= 0 && cols[idxPrice] !== "") ? Number(cols[idxPrice]) : null;

    if (!key) continue;
    if (!Number.isFinite(stock) || stock < 0) continue;

    items.push({
      key,
      displayName: nameRaw,
      stock: Math.floor(stock),
      threshold: Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 5,
      price: (price !== null && Number.isFinite(price) && price >= 0) ? price : null
    });
  }

  return items;
}

function splitCSVLine(line) {
  // Minimal CSV parser for commas + quoted fields
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

// ========= RENDER =========
function renderAll() {
  renderSuggestions();
  renderInventory();
  renderOrders();
  renderDashboard();
  renderSales();
}

function renderSuggestions() {
  itemSuggestions.innerHTML = "";
  const sorted = [...inventory].sort((a, b) => a.displayName.localeCompare(b.displayName));
  sorted.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.displayName;
    itemSuggestions.appendChild(opt);
  });
}

function renderInventory() {
  const q = normalizeName(invSearch.value);
  const onlyLow = invOnlyLow.checked;
  const sortMode = invSort.value;

  let list = [...inventory];

  if (q) {
    list = list.filter(i => normalizeName(i.displayName).includes(q));
  }

  if (onlyLow) {
    list = list.filter(i => i.stock <= (i.threshold ?? 5));
  }

  list.sort((a, b) => {
    if (sortMode === "name_asc") return a.displayName.localeCompare(b.displayName);
    if (sortMode === "name_desc") return b.displayName.localeCompare(a.displayName);
    if (sortMode === "stock_asc") return a.stock - b.stock;
    if (sortMode === "stock_desc") return b.stock - a.stock;
    return 0;
  });

  inventoryList.innerHTML = "";

  if (list.length === 0) {
    inventoryList.innerHTML = `<li class="item-row"><span class="muted">No inventory items found.</span></li>`;
    return;
  }

  list.forEach(item => {
    const isLow = item.stock <= (item.threshold ?? 5);

    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div class="item-main">
        <div class="item-title">
          <strong>${esc(item.displayName)}</strong>
          <span class="pill ${isLow ? "warn" : "ok"}">Stock: ${item.stock}</span>
          <span class="pill">Low ≤ ${(item.threshold ?? 5)}</span>
          ${item.price !== null ? `<span class="pill">₱ ${esc(money(item.price))}</span>` : ""}
        </div>
        <div class="muted">
          Key: <code>${esc(item.key)}</code>
        </div>
      </div>

      <div class="row-actions">
        <button class="small-btn" type="button" data-edit="${esc(item.key)}">Edit</button>
        <button class="small-btn small-danger" type="button" data-remove="${esc(item.key)}">Remove</button>
      </div>
    `;
    inventoryList.appendChild(li);
  });

  inventoryList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });

  inventoryList.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.dataset.remove));
  });
}

function renderOrders() {
  const q = normalizeName(orderSearch.value);
  const filter = orderFilter.value;

  let list = [...orders];

  if (q) {
    list = list.filter(o =>
      normalizeName(o.itemName).includes(q) ||
      normalizeName(o.status).includes(q)
    );
  }

  if (filter === "pending") list = list.filter(o => o.status === "Pending");
  if (filter === "delivered") list = list.filter(o => o.status === "Delivered");

  orderList.innerHTML = "";

  if (list.length === 0) {
    orderList.innerHTML = `<li class="item-row"><span class="muted">No orders found.</span></li>`;
    return;
  }

  list.forEach(o => {
    const dateStr = new Date(o.createdAt).toLocaleString();
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div class="item-main">
        <div class="item-title">
          <strong>${esc(o.itemName)}</strong>
          <span class="pill">Qty: ${o.qty}</span>
          <span class="pill ${o.status === "Delivered" ? "ok" : "warn"}">${esc(o.status)}</span>
        </div>
        <div class="muted">Placed: ${esc(dateStr)}</div>
      </div>

      <div class="row-actions">
        <button class="small-btn" type="button" data-toggle="${esc(o.id)}">
          ${o.status === "Delivered" ? "Undo" : "Mark Delivered"}
        </button>
        <button class="small-btn small-danger" type="button" data-cancel="${esc(o.id)}">Cancel</button>
      </div>
    `;
    orderList.appendChild(li);
  });

  orderList.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleDelivered(btn.dataset.toggle));
  });

  orderList.querySelectorAll("[data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => cancelOrder(btn.dataset.cancel));
  });
}

function renderDashboard() {
  const itemsCount = inventory.length;
  const lowCount = inventory.filter(i => i.stock <= (i.threshold ?? 5)).length;

  const totalOrders = orders.length;
  const pending = orders.filter(o => o.status === "Pending").length;
  const delivered = orders.filter(o => o.status === "Delivered").length;

  statItems.textContent = itemsCount;
  statLowStock.textContent = lowCount;
  statOrders.textContent = totalOrders;
  statPending.textContent = pending;
  statDelivered.textContent = delivered;

  // Alerts
  lowStockAlerts.innerHTML = "";
  const lowItems = inventory
    .filter(i => i.stock <= (i.threshold ?? 5))
    .sort((a, b) => a.stock - b.stock);

  if (lowItems.length === 0) {
    lowStockAlerts.innerHTML = `<div class="alert" style="background:#ecfeff;border-color:#a5f3fc;color:#155e75;">
      ✅ No low-stock items. You're good.
    </div>`;
    return;
  }

  lowItems.forEach(i => {
    const div = document.createElement("div");
    div.className = "alert";
    div.textContent = `Low stock: ${i.displayName} (Stock: ${i.stock}, Threshold: ${i.threshold ?? 5})`;
    lowStockAlerts.appendChild(div);
  });
}

function computeSales() {
  // Units sold per item from ALL orders (including delivered/pending) — you can change to delivered-only if desired
  const map = new Map(); // key -> units
  orders.forEach(o => {
    map.set(o.itemKey, (map.get(o.itemKey) ?? 0) + o.qty);
  });

  const rows = [];

  map.forEach((units, key) => {
    const item = inventory.find(i => i.key === key);
    const name = item?.displayName ?? key;
    const price = item?.price ?? null;
    const revenue = (price === null) ? null : units * price;

    rows.push({ itemKey: key, itemName: name, units, revenue });
  });

  rows.sort((a, b) => b.units - a.units);
  return rows;
}

function renderSales() {
  const q = normalizeName(salesSearch.value);
  const sales = computeSales().filter(s => normalizeName(s.itemName).includes(q));

  salesBody.innerHTML = "";

  if (sales.length === 0) {
    salesBody.innerHTML = `<tr><td colspan="3" class="muted">No sales data yet.</td></tr>`;
    return;
  }

  sales.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(s.itemName)}</td>
      <td>${s.units}</td>
      <td>${s.revenue === null ? `<span class="muted">—</span>` : `₱ ${esc(money(s.revenue))}`}</td>
    `;
    salesBody.appendChild(tr);
  });
}

// ========= INIT =========
renderAll();
