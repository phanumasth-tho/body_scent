document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. หน้า PRODUCT (product.html)
  // ==========================================================================
  const productList = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');

  if (productList) {
    // อ่าน parameter ?mood=xxx จาก URL (ถ้ามี)
    const urlParams = new URLSearchParams(window.location.search);
    const initialMood = urlParams.get('mood') ? urlParams.get('mood').toLowerCase() : 'all';

    // ดึงข้อมูลสินค้าจาก products.json
    fetch('products.json')
      .then(response => response.json())
      .then(products => {
        renderProducts(products, initialMood);
        setupFilterBar(products, initialMood);
      })
      .catch(error => console.error('Error loading products:', error));
  }

  // ฟังก์ชันแสดงการ์ดสินค้า
  function renderProducts(products, moodFilter) {
    productList.innerHTML = '';

    const filteredProducts = (moodFilter === 'all')
      ? products
      : products.filter(p => p.mood.toLowerCase() === moodFilter);

    if (filteredProducts.length === 0) {
      productList.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px 0;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
      return;
    }

    filteredProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      // สร้างชื่อสินค้าพร้อมไซส์เพื่อส่งไปยังหน้าสั่งซื้อ
      const fullItemName = `${product.name} ${product.size}`;
      const orderUrl = `order.html?item=${encodeURIComponent(fullItemName)}&price=${encodeURIComponent(product.price)}`;

      card.innerHTML = `
        <div class="product-image-wrap">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="mood-tag">
              <span class="mood-dot ${product.mood.toLowerCase()}"></span>
              ${product.mood}
            </span>
            <span class="product-size">${product.size}</span>
          </div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-bottom">
            <span class="product-price">฿${product.price}</span>
            <a href="${orderUrl}" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.75rem;">สั่งซื้อ</a>
          </div>
        </div>
      `;
      productList.appendChild(card);
    });
  }

  // ฟังก์ชันจัดการปุ่ม กรองสินค้าตาม mood
  function setupFilterBar(products, activeMood) {
    if (!filterBar) return;
    const filterButtons = filterBar.querySelectorAll('button');

    filterButtons.forEach(btn => {
      const btnMood = (btn.getAttribute('data-mood') || 'all').toLowerCase();

      // ไฮไลต์ปุ่มตามค่าเริ่มต้น
      if (btnMood === activeMood) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }

      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(products, btnMood);
      });
    });
  }


  // ==========================================================================
  // 2. หน้า ORDER (order.html)
  // ==========================================================================
  const orderForm = document.getElementById('orderForm');

  if (orderForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const itemParam = urlParams.get('item');
    const priceParam = urlParams.get('price');

    const itemsInput = document.getElementById('items');
    const totalInput = document.getElementById('total');

    // เติมค่าอัตโนมัติลงในช่อง id="items" และ id="total" ทันทีที่โหลดหน้า
    if (itemParam && itemsInput) {
      itemsInput.value = itemParam;
    }
    if (priceParam && totalInput) {
      totalInput.value = priceParam;
    }

    // จัดการการส่งฟอร์มสั่งซื้อ
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const payload = {
        customerName: document.getElementById('customerName')?.value || '',
        contact: document.getElementById('contact')?.value || '',
        items: document.getElementById('items')?.value || '',
        total: document.getElementById('total')?.value || '',
        note: document.getElementById('note')?.value || ''
      };

      // ส่งข้อมูลไปยัง Google Apps Script
      fetch('https://script.google.com/macros/s/AKfycbxEJ8qce4SJWyU0An_YU4s75Fd3uhDNPY415aL2qZcsdY_xoFmiGQFgG24XhwqOapc/exec', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
    });
  }


  // ==========================================================================
  // 3. หน้า ADMIN (admin.html)
  // ==========================================================================
  const ordersTableTbody = document.querySelector('#ordersTable tbody');

  if (ordersTableTbody) {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxSvN0K8lScGQixepDek6LGr-6YKjbEGuuJrlJCVN7c2uTzpHa7bcpxmU1mmb1EpJEakIzdfJjmzZO/pub?gid=0&single=true&output=csv';

    fetch(csvUrl)
      .then(res => res.text())
      .then(csvText => {
        const rows = parseCSV(csvText);

        // ตรวจสอบว่ามีข้อมูลหรือไม่ (row[0] คือ Header)
        if (rows.length <= 1) {
          ordersTableTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">ยังไม่มีรายการสั่งซื้อ</td></tr>';
          return;
        }

        // ดึงเฉพาะแถวข้อมูล (ข้าม Header) แล้วเรียงให้รายการใหม่อยู่บนสุด
        const dataRows = rows.slice(1).reverse();
        ordersTableTbody.innerHTML = '';

        dataRows.forEach(row => {
          if (row.length < 2) return; // ข้ามแถวว่าง

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(formatDate(row[0]))}</td>
            <td>${escapeHtml(row[1] || '')}</td>
            <td>${escapeHtml(row[2] || '')}</td>
            <td>${escapeHtml(row[3] || '')}</td>
            <td>${escapeHtml(row[4] || '')}</td>
            <td>${escapeHtml(row[5] || '')}</td>
          `;
          ordersTableTbody.appendChild(tr);
        });
      })
      .catch(error => {
        console.error('Error fetching CSV:', error);
        ordersTableTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้</td></tr>';
      });
  }

  // Custom CSV Parser (รองรับกรณีมีเครื่องหมายอัญประกาศ และคอมมาในข้อความ)
  function parseCSV(text) {
    const lines = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) {
        lines.push(currentRow);
      }
    }

    return lines;
  }

  // ป้องกัน XSS
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ฟอร์แมตวันเวลาให้อ่านง่าย
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  }
});