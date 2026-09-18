(() => {
  'use strict';

  // Master-carton data is shared with the Gunpowder Studios Box Packer.
  // Pallet estimates use a conservative planning model calibrated so BOD = 40 cartons = 480 games.
  const PRODUCTS = {
    bod: { name: 'Bag of Dungeon', rrp: 44.99, vat: 20, make: 2.62, freight: 1.70, storage: 3.00, carton: { qty: 12, kg: 10.4, l: 43.7, w: 34.6, h: 23.7 } },
    bod2: { name: 'Bag of Dungeon 2 / Forest', rrp: 44.99, vat: 20, make: 3.42, freight: 1.70, storage: 3.00, carton: { qty: 12, kg: 10.4, l: 43.7, w: 34.6, h: 23.7 } },
    moonsDeluxe: { name: '7 Moons Deluxe', rrp: 44.99, vat: 20, make: 3.42, freight: 1.70, storage: 3.00, carton: { qty: 8, kg: 9.3, l: 45, w: 23, h: 24 } },
    moonsBase: { name: '7 Moons Base', rrp: 44.99, vat: 20, make: 2.55, freight: 1.70, storage: 3.00, carton: { qty: 8, kg: 7.7, l: 45, w: 23, h: 24 } },
    kastles: { name: 'Kastles', rrp: 14.99, vat: 20, make: 0.96, freight: 0.75, storage: 1.50, carton: { qty: 90, kg: 14.3, l: 44.5, w: 24.8, h: 23 } },
    legends: { name: 'Legends', rrp: 19.99, vat: 20, make: 1.36, freight: 0.75, storage: 1.50, carton: { qty: 40, kg: 7.5, l: 35.5, w: 29.5, h: 25.5 } },
    legends2: { name: 'Legends 2', rrp: 29.99, vat: 20, make: 1.69, freight: 0.75, storage: 1.50, carton: { qty: 20, kg: 7.0, l: 29, w: 33.6, h: 21.4 } },
    rabbito: { name: 'Rabbito V2', rrp: 34.99, vat: 20, make: 3.27, freight: 2.20, storage: 3.60, carton: { qty: 8, kg: 6.1, l: 44, w: 30.5, h: 22.8 } },
    cheese: { name: 'Cheese', rrp: 17.99, vat: 20, make: 2.31, freight: 0.75, storage: 1.50, carton: { qty: 12, kg: 2.3, l: 25, w: 25, h: 16.5 } },
    book: { name: 'Book of Dungeon', rrp: 16.99, vat: 0, make: 0, freight: 0, storage: 0, needsCosts: true, needsPack: true },
    custom: { name: 'Custom product', rrp: 0, vat: 20, make: 0, freight: 0, storage: 0, needsPack: true }
  };

  const PALLET = {
    length: 120,
    width: 100,
    loadedHeight: 180,
    palletHeight: 15,
    palletWeight: 20,
    maxGrossWeight: 900,
    packingFactor: 1.38
  };

  const $ = (id) => document.getElementById(id);
  const inputs = [
    'rrp','vatRate','makeCost','inboundFreight','storageMisc','importDuty','packaging','otherProductCost',
    'distDiscount','distQty','palletCost','gamesPerCarton','cartonsPerPallet','distReturns','distOther',
    'amazonPrice','amazonReferral','amazonFba','amazonInbound','amazonStorage','amazonAds','amazonReturns','amazonOther','amazonMonthlyPlan','amazonMonthlyUnits',
    'directPrice','directPaymentPct','directPaymentFixed','directPostage','directAds','directReturns','directOther',
    'targetMargin','reservePct'
  ];

  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  const num = (id, min = 0, max = Number.POSITIVE_INFINITY) => clamp(parseFloat($(id).value), min, max);
  const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
  const pct = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

  function estimateCartonsPerPallet(carton) {
    if (!carton || !carton.qty || !carton.l || !carton.w || !carton.h || !carton.kg) return 0;
    const usableVolume = PALLET.length * PALLET.width * (PALLET.loadedHeight - PALLET.palletHeight);
    const cartonVolume = carton.l * carton.w * carton.h;
    const byVolume = Math.floor(usableVolume / (cartonVolume * PALLET.packingFactor));
    const byWeight = Math.floor((PALLET.maxGrossWeight - PALLET.palletWeight) / carton.kg);
    return Math.max(1, Math.min(byVolume, byWeight));
  }

  function buildProductSelect() {
    $('productSelect').innerHTML = Object.entries(PRODUCTS).map(([key, p]) => `<option value="${key}">${p.name}</option>`).join('');
  }

  function updatePackNote(p) {
    const note = $('packDataNote');
    if (!p.carton) {
      note.textContent = 'No master-carton data is stored for this product yet. Enter games per carton and cartons per pallet manually to include distributor delivery.';
      return;
    }
    const estimatedCartons = estimateCartonsPerPallet(p.carton);
    const games = p.carton.qty * estimatedCartons;
    note.textContent = `Box Packer data: ${p.carton.qty} games/carton · carton ${p.carton.l} × ${p.carton.w} × ${p.carton.h} cm · ${p.carton.kg} kg. Planning estimate: ${estimatedCartons} cartons / ${games.toLocaleString('en-GB')} games per pallet. Edit after a real packed pallet if needed.`;
  }

  function applyProduct(key) {
    const p = PRODUCTS[key] || PRODUCTS.custom;
    const cartonsPerPallet = p.carton ? estimateCartonsPerPallet(p.carton) : 0;
    const gamesPerCarton = p.carton?.qty || 0;
    const gamesPerPallet = cartonsPerPallet * gamesPerCarton;

    $('rrp').value = p.rrp.toFixed(2);
    $('vatRate').value = p.vat.toFixed(1);
    $('makeCost').value = p.make.toFixed(2);
    $('inboundFreight').value = p.freight.toFixed(2);
    $('storageMisc').value = p.storage.toFixed(2);
    $('importDuty').value = '0.00';
    $('packaging').value = '0.00';
    $('otherProductCost').value = '0.00';

    $('amazonPrice').value = p.rrp.toFixed(2);
    $('directPrice').value = p.rrp.toFixed(2);

    $('palletCost').value = '80.00';
    $('gamesPerCarton').value = gamesPerCarton || '';
    $('cartonsPerPallet').value = cartonsPerPallet || '';
    $('distQty').value = gamesPerPallet || 200;

    $('presetWarning').classList.toggle('hidden', !p.needsCosts);
    $('presetWarning').textContent = p.needsCosts ? 'Book of Dungeon has its RRP and 0% VAT preset, but its print / landed costs are not in the Gardners game-cost sheet. Add the real unit costs before relying on the result.' : '';
    updatePackNote(p);
    calculate();
  }

  function currentChannel() {
    return document.querySelector('input[name="channel"]:checked')?.value || 'distributor';
  }

  function productCosts() {
    const parts = {
      'Manufacturing': num('makeCost'),
      'China → UK freight': num('inboundFreight'),
      'Storage / handling / misc': num('storageMisc'),
      'Import duty / tariff': num('importDuty'),
      'Packaging / prep': num('packaging'),
      'Other product cost': num('otherProductCost')
    };
    return { parts, total: Object.values(parts).reduce((a, b) => a + b, 0) };
  }

  function baseVat(price) {
    const rate = num('vatRate', 0, 100) / 100;
    const exVat = rate > 0 ? price / (1 + rate) : price;
    return { rate, exVat, vat: price - exVat };
  }

  function palletLogistics() {
    const qty = Math.max(1, Math.round(num('distQty', 1)));
    const gamesPerCarton = Math.max(0, Math.round(num('gamesPerCarton', 0)));
    const cartonsPerPallet = Math.max(0, Math.round(num('cartonsPerPallet', 0)));
    const gamesPerPallet = gamesPerCarton * cartonsPerPallet;
    const palletCost = num('palletCost');

    if (gamesPerPallet <= 0) {
      return { qty, gamesPerCarton, cartonsPerPallet, gamesPerPallet: 0, pallets: 0, totalDelivery: 0, deliveryPerUnit: 0, complete: false };
    }

    const pallets = Math.ceil(qty / gamesPerPallet);
    const totalDelivery = pallets * palletCost;
    return {
      qty,
      gamesPerCarton,
      cartonsPerPallet,
      gamesPerPallet,
      pallets,
      totalDelivery,
      deliveryPerUnit: totalDelivery / qty,
      complete: true
    };
  }

  function channelCalculation() {
    const channel = currentChannel();
    const base = productCosts();
    let grossPrice = num('rrp');
    let revenueExVat = 0;
    let vat = 0;
    let channelCosts = {};
    let quantity = 1;
    let label = '';
    let variableRateGross = 0;
    let fixedChannel = 0;
    let logistics = null;

    if (channel === 'distributor') {
      const rrpVat = baseVat(grossPrice);
      const discount = num('distDiscount', 0, 100) / 100;
      const returns = num('distReturns', 0, 100) / 100;
      logistics = palletLogistics();

      revenueExVat = rrpVat.exVat * (1 - discount);
      vat = rrpVat.vat;
      channelCosts = {
        'UK pallet delivery / unit': logistics.deliveryPerUnit,
        'Returns / credit allowance': revenueExVat * returns,
        'Other distributor cost': num('distOther')
      };
      quantity = logistics.qty;
      label = 'Distributor';
    } else if (channel === 'amazon') {
      grossPrice = num('amazonPrice');
      const v = baseVat(grossPrice);
      revenueExVat = v.exVat;
      vat = v.vat;
      const referral = num('amazonReferral', 0, 100) / 100;
      const ads = num('amazonAds', 0, 100) / 100;
      const returns = num('amazonReturns', 0, 100) / 100;
      const monthlyUnits = Math.max(1, num('amazonMonthlyUnits', 1));
      const planAllocation = num('amazonMonthlyPlan') / monthlyUnits;
      variableRateGross = referral + ads + returns;
      fixedChannel = num('amazonFba') + num('amazonInbound') + num('amazonStorage') + num('amazonOther') + planAllocation;
      channelCosts = {
        'Amazon referral fee': grossPrice * referral,
        'FBA fulfilment': num('amazonFba'),
        'Inbound to Amazon': num('amazonInbound'),
        'Amazon storage': num('amazonStorage'),
        'Advertising': grossPrice * ads,
        'Returns allowance': grossPrice * returns,
        'Professional plan allocation': planAllocation,
        'Other Amazon fee': num('amazonOther')
      };
      label = 'Amazon UK';
    } else {
      grossPrice = num('directPrice');
      const v = baseVat(grossPrice);
      revenueExVat = v.exVat;
      vat = v.vat;
      const payment = num('directPaymentPct', 0, 100) / 100;
      const ads = num('directAds', 0, 100) / 100;
      const returns = num('directReturns', 0, 100) / 100;
      variableRateGross = payment + ads + returns;
      fixedChannel = num('directPaymentFixed') + num('directPostage') + num('directOther');
      channelCosts = {
        'Payment percentage fee': grossPrice * payment,
        'Payment fixed fee': num('directPaymentFixed'),
        'Postage / fulfilment': num('directPostage'),
        'Advertising': grossPrice * ads,
        'Returns allowance': grossPrice * returns,
        'Other selling cost': num('directOther')
      };
      label = 'Direct / website';
    }

    const channelTotal = Object.values(channelCosts).reduce((a, b) => a + b, 0);
    const contribution = revenueExVat - base.total - channelTotal;
    const margin = revenueExVat > 0 ? contribution / revenueExVat * 100 : 0;

    return { channel, label, grossPrice, revenueExVat, vat, productParts: base.parts, productTotal: base.total, channelCosts, channelTotal, contribution, margin, quantity, variableRateGross, fixedChannel, logistics };
  }

  function targetDeal(calc) {
    const target = num('targetMargin', 0, 95) / 100;
    const v = num('vatRate', 0, 100) / 100;

    if (calc.channel === 'distributor') {
      const rrpExVat = v > 0 ? num('rrp') / (1 + v) : num('rrp');
      const returns = num('distReturns', 0, 100) / 100;
      const delivery = calc.logistics?.deliveryPerUnit || 0;
      const fixedCost = calc.productTotal + delivery + num('distOther');
      const denom = 1 - returns - target;
      if (rrpExVat <= 0 || denom <= 0) return { label: 'Maximum distributor discount', value: 'Not achievable', note: 'The target margin is too high for the current returns allowance / costs.' };
      const requiredRevenue = fixedCost / denom;
      const maxDiscount = (1 - requiredRevenue / rrpExVat) * 100;
      if (maxDiscount < 0) return { label: 'Maximum distributor discount', value: '0%', note: `Even at full ex-VAT RRP, the current costs do not reach a ${pct(target * 100)} contribution margin.` };
      return { label: 'Maximum distributor discount', value: pct(Math.min(100, maxDiscount)), note: `Highest discount that still leaves about a ${pct(target * 100)} contribution margin for this order size.` };
    }

    const grossFactor = 1 / (1 + v);
    const fixed = calc.productTotal + calc.fixedChannel;
    const denom = grossFactor * (1 - target) - calc.variableRateGross;
    if (denom <= 0) return { label: 'Minimum selling price', value: 'Not achievable', note: 'Variable fees are too high for this target margin.' };
    const price = fixed / denom;
    return { label: 'Minimum selling price', value: money(price), note: `Approximate inc-VAT selling price needed for a ${pct(target * 100)} contribution margin.` };
  }

  function renderBreakdown(calc) {
    const rows = [];
    rows.push({ label: 'Revenue ex VAT', amount: calc.revenueExVat, kind: 'revenue' });
    Object.entries(calc.productParts).forEach(([label, amount]) => { if (amount > 0) rows.push({ label, amount: -amount, kind: 'cost' }); });
    Object.entries(calc.channelCosts).forEach(([label, amount]) => { if (amount > 0) rows.push({ label, amount: -amount, kind: 'cost' }); });
    $('breakdownBody').innerHTML = rows.map(r => `<tr class="${r.kind}"><td>${r.label}</td><td>${r.amount >= 0 ? money(r.amount) : `−${money(Math.abs(r.amount))}`}</td></tr>`).join('');
    $('breakdownContribution').textContent = money(calc.contribution);
  }

  function renderPalletSummary(calc) {
    const summary = $('palletSummary');
    if (calc.channel !== 'distributor') return;
    const l = calc.logistics;
    if (!l?.complete) {
      summary.className = 'pallet-summary warning';
      summary.textContent = 'Pallet delivery is not included yet. Enter games per carton and cartons per pallet.';
      return;
    }
    summary.className = 'pallet-summary';
    summary.innerHTML = `<strong>${l.gamesPerPallet.toLocaleString('en-GB')} games / pallet</strong> · ${l.gamesPerCarton} per carton × ${l.cartonsPerPallet} cartons · ${l.pallets} pallet${l.pallets === 1 ? '' : 's'} for this order · <strong>${money(l.deliveryPerUnit)} delivery / game</strong>`;
  }

  function calculate() {
    const calc = channelCalculation();
    $('metricRevenue').textContent = money(calc.revenueExVat);
    $('metricProductCosts').textContent = money(calc.productTotal);
    $('metricChannelCosts').textContent = money(calc.channelTotal);
    $('metricContribution').textContent = money(calc.contribution);
    $('metricMargin').textContent = pct(calc.margin);
    $('metricVat').textContent = money(calc.vat);
    $('metricChannelNote').textContent = `${calc.label} costs`;
    $('channelBadge').textContent = calc.label;

    const health = $('healthMessage');
    health.className = 'health-message ' + (calc.contribution > 0 ? 'good' : calc.contribution < 0 ? 'bad' : 'neutral');
    if (calc.contribution > 0) health.textContent = `${money(calc.contribution)} per game is left to contribute towards salaries, marketing and other company overheads.`;
    else if (calc.contribution < 0) health.textContent = `This setup loses ${money(Math.abs(calc.contribution))} per game before company overheads.`;
    else health.textContent = 'This setup is at break-even before company overheads.';

    renderBreakdown(calc);
    renderPalletSummary(calc);

    const target = targetDeal(calc);
    $('targetLabel').textContent = target.label;
    $('targetValue').textContent = target.value;
    $('targetNote').textContent = target.note;

    const restockBase = num('makeCost') + num('inboundFreight') + num('importDuty');
    const reserve = restockBase * num('reservePct', 0, 200) / 100;
    $('reserveUnit').textContent = money(reserve);
    $('cashAfterReserve').textContent = money(calc.contribution - reserve);

    const orderBlock = $('orderBlock');
    orderBlock.classList.toggle('hidden', calc.channel !== 'distributor');
    if (calc.channel === 'distributor') {
      $('orderQtyResult').textContent = calc.quantity.toLocaleString('en-GB');
      $('orderPallets').textContent = calc.logistics?.complete ? String(calc.logistics.pallets) : '—';
      $('orderDeliveryUnit').textContent = calc.logistics?.complete ? money(calc.logistics.deliveryPerUnit) : '—';
      $('orderRevenue').textContent = money(calc.revenueExVat * calc.quantity);
      $('orderContribution').textContent = money(calc.contribution * calc.quantity);
    }

    saveState();
  }

  function switchChannel(channel) {
    $('distributorFields').classList.toggle('hidden', channel !== 'distributor');
    $('amazonFields').classList.toggle('hidden', channel !== 'amazon');
    $('directFields').classList.toggle('hidden', channel !== 'direct');
    calculate();
  }

  function saveState() {
    try {
      const state = { product: $('productSelect').value, channel: currentChannel(), values: {} };
      inputs.forEach(id => { state.values[id] = $(id).value; });
      localStorage.setItem('gunpowder-profit-calculator-v2', JSON.stringify(state));
    } catch (_) { }
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem('gunpowder-profit-calculator-v2');
      if (!raw) return false;
      const state = JSON.parse(raw);
      if (PRODUCTS[state.product]) $('productSelect').value = state.product;
      Object.entries(state.values || {}).forEach(([id, value]) => { if ($(id)) $(id).value = value; });
      const radio = document.querySelector(`input[name="channel"][value="${state.channel}"]`);
      if (radio) radio.checked = true;
      const p = PRODUCTS[$('productSelect').value];
      $('presetWarning').classList.toggle('hidden', !p?.needsCosts);
      if (p?.needsCosts) $('presetWarning').textContent = 'Book of Dungeon has its RRP and 0% VAT preset, but its print / landed costs are not in the Gardners game-cost sheet. Add the real unit costs before relying on the result.';
      updatePackNote(p || PRODUCTS.custom);
      switchChannel(currentChannel());
      return true;
    } catch (_) { return false; }
  }

  buildProductSelect();
  $('productSelect').value = 'bod';
  if (!restoreState()) applyProduct('bod');

  $('productSelect').addEventListener('change', (e) => applyProduct(e.target.value));
  document.querySelectorAll('input[name="channel"]').forEach(el => el.addEventListener('change', () => switchChannel(currentChannel())));
  inputs.forEach(id => $(id).addEventListener('input', calculate));
  $('resetBtn').addEventListener('click', () => applyProduct($('productSelect').value));
})();