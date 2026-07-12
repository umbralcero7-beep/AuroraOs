const fs = require('fs');
const path = require('path');

const rawProducts = [
  {"nombre":"POLLO ASADO","es_critico":true,"stock_inicial":150,"codigo":"01","precio":45000,"categoria":"PROTEINAS"},
  {"nombre":"1/2 POLLO ASADO","es_critico":true,"stock_inicial":150,"codigo":"02","precio":25000,"categoria":"PROTEINAS"},
  {"nombre":"1/4 POLLO ASADO","es_critico":true,"stock_inicial":150,"codigo":"03","precio":14500,"categoria":"PROTEINAS"},
  {"nombre":"POLLO BROASTER","es_critico":true,"stock_inicial":150,"codigo":"04","precio":47000,"categoria":"PROTEINAS"},
  {"nombre":"1/2 POLLO BROASTER","es_critico":true,"stock_inicial":150,"codigo":"05","precio":27000,"categoria":"PROTEINAS"},
  {"nombre":"1/4 POLLO BROASTER","es_critico":true,"stock_inicial":150,"codigo":"06","precio":15500,"categoria":"PROTEINAS"},
  {"nombre":"PAPA FRANCESA","es_critico":false,"stock_inicial":0,"codigo":"07","precio":10000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"PORCION DE YUCA","es_critico":false,"stock_inicial":0,"codigo":"08","precio":10000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"PORCION PAPA SALADA","es_critico":false,"stock_inicial":0,"codigo":"09","precio":7500,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"PORCION PATACON","es_critico":false,"stock_inicial":0,"codigo":"10","precio":10000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"VIUDO DE CAPAZ","es_critico":true,"stock_inicial":150,"codigo":"11","precio":52000,"categoria":"PROTEINAS"},
  {"nombre":"PORCION ENSALADA","es_critico":false,"stock_inicial":0,"codigo":"12","precio":9000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"PORCION ARROZ","es_critico":false,"stock_inicial":0,"codigo":"13","precio":7000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"PORCION AREPA","es_critico":false,"stock_inicial":0,"codigo":"14","precio":5000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"BANDEJA BROASTER","es_critico":true,"stock_inicial":150,"codigo":"15","precio":34000,"categoria":"PROTEINAS"},
  {"nombre":"CARNE ASADA","es_critico":true,"stock_inicial":150,"codigo":"16","precio":44000,"categoria":"PROTEINAS"},
  {"nombre":"PECHUGA A LA PLANCHA","es_critico":true,"stock_inicial":150,"codigo":"17","precio":45000,"categoria":"PROTEINAS"},
  {"nombre":"BANDEJA CON POLLO ASADO","es_critico":true,"stock_inicial":150,"codigo":"18","precio":33000,"categoria":"PROTEINAS"},
  {"nombre":"ARROZ CON POLLO","es_critico":true,"stock_inicial":150,"codigo":"19","precio":36000,"categoria":"PROTEINAS"},
  {"nombre":"MOJARRA","es_critico":true,"stock_inicial":150,"codigo":"20","precio":49000,"categoria":"PROTEINAS"},
  {"nombre":"BAGRE FRITO / SALSA","es_critico":true,"stock_inicial":150,"codigo":"21","precio":52000,"categoria":"PROTEINAS"},
  {"nombre":"CLUB COLOMBIA","es_critico":true,"stock_inicial":150,"codigo":"22","precio":7000,"categoria":"BEBIDAS"},
  {"nombre":"SOPA MENUDENCIAS","es_critico":false,"stock_inicial":0,"codigo":"23","precio":13500,"categoria":"SOPAS"},
  {"nombre":"COLA Y POLA / MALTA","es_critico":true,"stock_inicial":150,"codigo":"24","precio":5000,"categoria":"BEBIDAS"},
  {"nombre":"CERVEZA BOTELLA","es_critico":true,"stock_inicial":150,"codigo":"25","precio":6000,"categoria":"BEBIDAS"},
  {"nombre":"PIEDRITAS PICANTES","es_critico":false,"stock_inicial":0,"codigo":"26","precio":15000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"GASEOSA 350 ML","es_critico":true,"stock_inicial":150,"codigo":"27","precio":5000,"categoria":"BEBIDAS"},
  {"nombre":"POSTRES","es_critico":false,"stock_inicial":0,"codigo":"28","precio":9500,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"CHURRASCO","es_critico":true,"stock_inicial":150,"codigo":"29","precio":50000,"categoria":"PROTEINAS"},
  {"nombre":"GASEOSA 2.5 LTS","es_critico":true,"stock_inicial":150,"codigo":"30","precio":13500,"categoria":"BEBIDAS"},
  {"nombre":"LIMONADA NATURAL","es_critico":true,"stock_inicial":150,"codigo":"31","precio":7000,"categoria":"BEBIDAS"},
  {"nombre":"GASEOSA 1.65 LTS","es_critico":true,"stock_inicial":150,"codigo":"32","precio":9500,"categoria":"BEBIDAS"},
  {"nombre":"AGUA BOTELLA","es_critico":true,"stock_inicial":150,"codigo":"33","precio":5500,"categoria":"BEBIDAS"},
  {"nombre":"1/2 SOPA DE MENUDENCIA","es_critico":false,"stock_inicial":0,"codigo":"34","precio":9500,"categoria":"SOPAS"},
  {"nombre":"1/2 SOPA DE ARROZ","es_critico":false,"stock_inicial":0,"codigo":"35","precio":9500,"categoria":"SOPAS"},
  {"nombre":"SOPA MENUDENCIA LLEVAR","es_critico":false,"stock_inicial":0,"codigo":"36","precio":14500,"categoria":"SOPAS"},
  {"nombre":"SOPA ARROZ CON CALLO LLEVAR","es_critico":false,"stock_inicial":0,"codigo":"37","precio":14500,"categoria":"SOPAS"},
  {"nombre":"MADURO","es_critico":false,"stock_inicial":0,"codigo":"38","precio":10000,"categoria":"ACOMPANAMIENTOS"},
  {"nombre":"ALITAS PICANTES","es_critico":true,"stock_inicial":150,"codigo":"39","precio":18000,"categoria":"PROTEINAS"},
  {"nombre":"COMBO 1","es_critico":true,"stock_inicial":150,"codigo":"40","precio":63000,"categoria":"PROTEINAS"},
  {"nombre":"COMBO 2","es_critico":true,"stock_inicial":150,"codigo":"41","precio":65000,"categoria":"PROTEINAS"},
  {"nombre":"SOPA DE ARROZ CON CALLO","es_critico":false,"stock_inicial":0,"codigo":"42","precio":13500,"categoria":"SOPAS"},
  {"nombre":"JUGO EN AGUA","es_critico":true,"stock_inicial":150,"codigo":"43","precio":9000,"categoria":"BEBIDAS"},
  {"nombre":"JUGO EN LECHE","es_critico":true,"stock_inicial":150,"codigo":"44","precio":10000,"categoria":"BEBIDAS"},
  {"nombre":"TE","es_critico":true,"stock_inicial":150,"codigo":"45","precio":5500,"categoria":"BEBIDAS"},
  {"nombre":"GASEOSA FLEXI 400 ML","es_critico":true,"stock_inicial":150,"codigo":"46","precio":5500,"categoria":"BEBIDAS"},
  {"nombre":"SOBREBARRIGA","es_critico":true,"stock_inicial":150,"codigo":"47","precio":47000,"categoria":"PROTEINAS"},
  {"nombre":"JUGO DEL VALLE","es_critico":true,"stock_inicial":150,"codigo":"48","precio":5500,"categoria":"BEBIDAS"},
  {"nombre":"COMBO MIXTO","es_critico":true,"stock_inicial":150,"codigo":"49","precio":65000,"categoria":"PROTEINAS"},
  {"nombre":"PUNTA DE ANCA","es_critico":true,"stock_inicial":150,"codigo":"50","precio":50000,"categoria":"PROTEINAS"},
  {"nombre":"COSTILLAS DE CERDO","es_critico":true,"stock_inicial":150,"codigo":"51","precio":47000,"categoria":"PROTEINAS"},
  {"nombre":"AGUILA LIGTH","es_critico":true,"stock_inicial":150,"codigo":"52","precio":6000,"categoria":"BEBIDAS"},
  {"nombre":"TRUCHA","es_critico":true,"stock_inicial":150,"codigo":"53","precio":45000,"categoria":"PROTEINAS"},
  {"nombre":"CAZUELA DE MARISCOS","es_critico":true,"stock_inicial":150,"codigo":"54","precio":60000,"categoria":"PROTEINAS"}
];

const sedes = ["s1", "s2", "s3"];

// Generate 54 products for each Sede with unique id format: code for s1, s2-code for s2, s3-code for s3
// Wait, to keep IDs simple and standard:
// For Sede s1: ID = `m-${item.codigo}`
// For Sede s2: ID = `m-s2-${item.codigo}`
// For Sede s3: ID = `m-s3-${item.codigo}`
const menuItems = [];

rawProducts.forEach((prod) => {
  let cat = "PLATOS_FUERTES";
  if (prod.categoria === "BEBIDAS") {
    cat = "BEBIDAS";
  } else if (prod.categoria === "ACOMPANAMIENTOS") {
    if (prod.nombre === "POSTRES") {
      cat = "POSTRES";
    } else {
      cat = "ENTRADAS";
    }
  } else if (prod.categoria === "SOPAS") {
    cat = "ENTRADAS";
  } else if (prod.categoria === "PROTEINAS") {
    if (prod.nombre.startsWith("COMBO")) {
      cat = "COMBOS";
    } else {
      cat = "PLATOS_FUERTES";
    }
  }

  const desc = `${prod.nombre} con la mejor preparación y sazón tradicional de la casa.`;

  // Create for Sede s1
  menuItems.push({
    id: `m-${prod.codigo}`,
    name: prod.nombre,
    price: prod.precio,
    category: cat,
    description: desc,
    ingredients: [],
    available: true,
    sedeId: "s1"
  });

  // Create for Sede s2
  menuItems.push({
    id: `m-s2-${prod.codigo}`,
    name: prod.nombre,
    price: prod.precio,
    category: cat,
    description: desc,
    ingredients: [],
    available: true,
    sedeId: "s2"
  });

  // Create for Sede s3
  menuItems.push({
    id: `m-s3-${prod.codigo}`,
    name: prod.nombre,
    price: prod.precio,
    category: cat,
    description: desc,
    ingredients: [],
    available: true,
    sedeId: "s3"
  });
});

console.log(`Generated ${menuItems.length} menu items across all 3 sedes.`);

// Read and update aurora_db.json
const dbPath = path.join(__dirname, '../aurora_db.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // Replace menuItems
  db.menuItems = menuItems;
  
  // Clear or map existing comandas, domicilios and invoices
  db.comandas = [];
  db.domicilios = [];
  db.invoices = [];
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✓ Successfully updated aurora_db.json menuItems and cleared historic transactions.');
} else {
  console.log('⚠️ aurora_db.json not found!');
}

// Update server.ts
const serverPath = path.join(__dirname, '../server.ts');
if (fs.existsSync(serverPath)) {
  let serverCode = fs.readFileSync(serverPath, 'utf8');
  
  // We need to replace the static DEFAULT_STATE.menuItems inside server.ts
  // Let's find the menuItems block inside DEFAULT_STATE
  const menuItemsStartMarker = 'menuItems: [';
  const menuItemsEndMarker = '],';
  
  const startIdx = serverCode.indexOf(menuItemsStartMarker);
  if (startIdx !== -1) {
    // Find the matching close bracket `],`
    const endIdx = serverCode.indexOf(menuItemsEndMarker, startIdx);
    if (endIdx !== -1) {
      const menuItemsJson = JSON.stringify(menuItems, null, 4);
      const before = serverCode.substring(0, startIdx);
      const after = serverCode.substring(endIdx + menuItemsEndMarker.length);
      
      const newServerCode = before + 'menuItems: ' + menuItemsJson + ',\n' + after;
      fs.writeFileSync(serverPath, newServerCode, 'utf8');
      console.log('✓ Successfully updated server.ts DEFAULT_STATE.menuItems with the 162 catalog entries.');
    } else {
      console.log('⚠️ Could not find the end of menuItems array in server.ts');
    }
  } else {
    console.log('⚠️ Could not find menuItems array in server.ts');
  }
} else {
  console.log('⚠️ server.ts not found!');
}
