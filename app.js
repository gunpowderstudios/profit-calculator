(() => {
  'use strict';

  const PRODUCTS = {
    bod: { name: 'Bag of Dungeon', rrp: 44.99, vat: 20, make: 2.62, freight: 1.70, storage: 3.00 },
    bod2: { name: 'Bag of Dungeon 2 / Forest', rrp: 44.99, vat: 20, make: 3.42, freight: 1.70, storage: 3.00 },
    moonsDeluxe: { name: '7 Moons Deluxe', rrp: 44.99, vat: 20, make: 3.42, freight: 1.70, storage: 3.00 },
    moonsBase: { name: '7 Moons Base', rrp: 44.99, vat: 20, make: 2.55, freight: 1.70, storage: 3.00 },
    kastles: { name: 'Kastles', rrp: 14.99, vat: 20, make: 0.96, freight: 0.75, storage: 1.50 },
    legends: { name: 'Legends', rrp: 19.99, vat: 20, make: 1.36, freight: 0.75, storage: 1.50 },
    legends2: { name: 'Legends 2', rrp: 29.99, vat: 20, make: 1.69, freight: 0.75, storage: 1.50 },
    rabbito: { name: 'Rabbito V2', rrp: 34.99, vat: 20, make: 3.27, freight: 2.20, storage: 3.60 },
    cheese: { name: 'Cheese', rrp: 17.99, vat: 20, make: 2.31, freight: 0.75, storage: 1.50 },
    book: { name: 'Book of Dungeon', rrp: 16.99, vat: 0, make: 3.12, freight: 0, storage: 0, needsCosts: true },
    custom: { name: 'Custom product', rrp: 0, vat: 20, make: 0, freight: 0, storage: 0 }
  };

  const $ = (id) => document.getElementById(id);
  const inputs = [
    'rrp','vatRate','makeCost','inboundFreight','storageMisc','importDuty','packaging','otherProductCost',
    'distDiscount','distQty','distShippingUnit','distReturns','distOther',
    'amazonPrice','amazonReferral','amazonFba','amazonInbound','amazonStorage','amazonAds','amazonReturns','amazonOther','amazonMonthlyPlan','amazonMonthlyUnits',
    'directPrice','directPaymentPct','directPaymentFixed','directPostage','directAds','directReturns','directOther',
    'targetMargin','reservePct'
  ];

  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  const num = (id, min = 0, max = Number.POSITIVE_INFINITY) => clamp(parseFloat($(id).value), min, max);
  const money = (n) => new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Number.isFinite(n) ? n : 0);
  const pct = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

  function buildProductSelect() {
    $('productSelect').innerHTML = Object.entries(PRODUCTS)
      .map(([key, p]) => `<option value="${key}">${p.name}</option>`).join('');
  }

  function applyProduct(key) {
    const p = PRODUCTS[key] || PRODUCTS.custom;
    $('rrp').value = p.rrp.toFixed(2);
    $('vatRate').value = p.vat.toFixed(1);
    $('ignoreVat').checked = false;
    $('vatRate').disabled = false;
    $('makeCost').value = p.make.toFixed(2);
    $('inboundFreight').value = p.freight.toFixed(2);
    $('storageMisc').value = p.storage.toFixed(2);
    $('importDuty').value = '0.00';
    $('packaging').value = '0.00';
    $('otherProductCost').value = '0.00';

    $('amazonPrice').value = p.rrp.toFixed(2);
    $('directPrice').value = p.rrp.toFixed(2);

    $('distQty').value = '100';
    $('distShippingUnit').value = '0.15';

    $('presetWarning').classList.toggle('hidden', !p.needsCosts);
    $('presetWarning').textContent = p.needsCosts
      ? 'Book of Dungeon has a £3.12 make cost preset. Freight, storage and other landed costs are still editable and should be added if they apply.'
      : '';

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
    if ($('ignoreVat').checked) return { rate: 0, exVat: price, vat: 0 };
    const rate = num('vatRate', 0, 100) / 100;
    const exVat = rate > 0 ? price / (1 + rate) : price;
    return { rate, exVat, vat: price - exVat };
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

    if (channel === 'distributor') {
      const rrpVat = baseVat(grossPrice);
      const discount = num('distDiscount', 0, 100) / 100;
      const returns = num('distReturns', 0, 100) / 100;
      const shippingPerGame = num('distShippingUnit');

      revenueExVat = rrpVat.exVat * (1 - discount);
      const distributorGross = grossPrice * (1 - discount);
      vat = $('ignoreVat').checked ? 0 : distributorGross - revenueExVat;
      channelCosts = {
        'Delivery / game': shippingPerGame,
        'Returns / credit allowance': revenueExVat * returns,
        'Other distributor cost': num('distOther')
      };
      quantity = Math.max(1, Math.round(num('distQty', 1)));
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

    return {
      channel, label, grossPrice, revenueExVat, vat,
      productParts: base.parts, productTotal: base.total,
      channelCosts, channelTotal, contribution, margin,
      quantity, variableRateGross, fixedChannel
    };
  }

  function targetDeal(calc) {
    const target = num('targetMargin', 0, 95) / 100;
    const v = $('ignoreVat').checked ? 0 : num('vatRate', 0, 100) / 100;

    if (calc.channel === 'distributor') {
      const rrpExVat = v > 0 ? num('rrp') / (1 + v) : num('rrp');
      const returns = num('distReturns', 0, 100) / 100;
      const fixedCost = calc.productTotal + num('distShippingUnit') + num('distOther');
      const denom = 1 - returns - target;

      if (rrpExVat <= 0 || denom <= 0) {
        return {
          label: 'Maximum distributor discount',
          value: 'Not achievable',
          note: 'The target margin is too high for the current costs.'
        };
      }

      const requiredRevenue = fixedCost / denom;
      const maxDiscount = (1 - requiredRevenue / rrpExVat) * 100;

      if (maxDiscount < 0) {
        return {
          label: 'Maximum distributor discount',
          value: '0%',
          note: `Even at full ex-VAT RRP, the current costs do not reach a ${pct(target * 100)} profit margin before overheads.`
        };
      }

      return {
        label: 'Maximum distributor discount',
        value: pct(Math.min(100, maxDiscount)),
        note: `Highest discount that still leaves about a ${pct(target * 100)} profit margin before overheads.`
      };
    }

    const grossFactor = 1 / (1 + v);
    const fixed = calc.productTotal + calc.fixedChannel;
    const denom = grossFactor * (1 - target) - calc.variableRateGross;

    if (denom <= 0) {
      return { label: 'Minimum selling price', value: 'Not achievable', note: 'Variable fees are too high for this target margin.' };
    }

    const price = fixed / denom;
    return {
      label: 'Minimum selling price',
      value: money(price),
      note: `Approximate inc-VAT selling price needed for a ${pct(target * 100)} profit margin before overheads.`
    };
  }

  function renderBreakdown(calc) {
    const rows = [];

    if (calc.channel === 'distributor') {
      const discountPct = num('distDiscount', 0, 100);
      const distributorPrice = calc.grossPrice * (1 - discountPct / 100);
      rows.push({ label: 'RRP incl VAT', amount: calc.grossPrice, kind: 'reference' });
      rows.push({ label: `Distributor price after ${pct(discountPct)} discount incl VAT`, amount: distributorPrice, kind: 'reference' });
    } else {
      rows.push({ label: 'Selling price incl VAT', amount: calc.grossPrice, kind: 'reference' });
    }

    rows.push({ label: 'Revenue ex VAT', amount: calc.revenueExVat, kind: 'revenue' });

    Object.entries(calc.productParts).forEach(([label, amount]) => {
      if (amount > 0) rows.push({ label, amount: -amount, kind: 'cost' });
    });

    Object.entries(calc.channelCosts).forEach(([label, amount]) => {
      if (amount > 0) rows.push({ label, amount: -amount, kind: 'cost' });
    });

    $('breakdownBody').innerHTML = rows.map(r =>
      `<tr class="${r.kind}"><td>${r.label}</td><td>${r.amount >= 0 ? money(r.amount) : `−${money(Math.abs(r.amount))}`}</td></tr>`
    ).join('');

    $('breakdownContribution').textContent = money(calc.contribution);
  }

  function calculate() {
    const calc = channelCalculation();

    $('metricRevenue').textContent = money(calc.revenueExVat);
    $('metricProductCosts').textContent = money(calc.productTotal);
    $('metricChannelCosts').textContent = money(calc.channelTotal);
    $('metricContribution').textContent = money(calc.contribution);
    $('metricMargin').textContent = pct(calc.margin);
    const ignoringVat = $('ignoreVat').checked;
    $('metricVat').textContent = ignoringVat ? 'Ignored' : money(calc.vat);
    $('vatMetricLabel').textContent = ignoringVat ? 'VAT ignored' : 'VAT inside customer price';
    $('vatMetricNote').textContent = ignoringVat ? 'Prices are being treated as ex-VAT' : 'Shown for clarity, not as a margin cost';
    $('vatMetricCard').classList.toggle('vat-ignored', ignoringVat);
    $('vatIgnoredNote').classList.toggle('hidden', !ignoringVat);
    $('metricChannelNote').textContent = `${calc.label} costs`;
    $('channelBadge').textContent = calc.label;

    const health = $('healthMessage');
    health.className = 'health-message ' + (calc.contribution > 0 ? 'good' : calc.contribution < 0 ? 'bad' : 'neutral');

    if (calc.contribution > 0) {
      health.textContent = `${money(calc.contribution)} profit before overheads per game is left after the game and selling costs. This still has to help pay wages, marketing and other company overheads.`;
    } else if (calc.contribution < 0) {
      health.textContent = `This setup loses ${money(Math.abs(calc.contribution))} per game before company overheads.`;
    } else {
      health.textContent = 'This setup is at break-even before company overheads.';
    }

    renderBreakdown(calc);

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
      const shippingPerGame = num('distShippingUnit');
      $('orderQtyResult').textContent = calc.quantity.toLocaleString('en-GB');
      $('orderDeliveryUnit').textContent = money(shippingPerGame);
      $('orderDeliveryTotal').textContent = money(shippingPerGame * calc.quantity);
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
      const state = {
        product: $('productSelect').value,
        channel: currentChannel(),
        ignoreVat: $('ignoreVat').checked,
        values: {}
      };
      inputs.forEach(id => { state.values[id] = $(id).value; });
      localStorage.setItem('gunpowder-profit-calculator-v3', JSON.stringify(state));
    } catch (_) { }
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem('gunpowder-profit-calculator-v3');
      if (!raw) return false;

      const state = JSON.parse(raw);
      if (PRODUCTS[state.product]) $('productSelect').value = state.product;

      Object.entries(state.values || {}).forEach(([id, value]) => {
        if ($(id)) $(id).value = value;
      });

      $('ignoreVat').checked = Boolean(state.ignoreVat);
      $('vatRate').disabled = $('ignoreVat').checked;

      const radio = document.querySelector(`input[name="channel"][value="${state.channel}"]`);
      if (radio) radio.checked = true;

      const p = PRODUCTS[$('productSelect').value];
      $('presetWarning').classList.toggle('hidden', !p?.needsCosts);
      if (p?.needsCosts) {
        $('presetWarning').textContent = 'Book of Dungeon has a £3.12 make cost preset. Freight, storage and other landed costs are still editable and should be added if they apply.';
      }

      switchChannel(currentChannel());
      return true;
    } catch (_) {
      return false;
    }
  }

  function resetCurrentProduct() {
    const channel = currentChannel();
    try { localStorage.removeItem('gunpowder-profit-calculator-v3'); } catch (_) { }

    applyProduct($('productSelect').value);

    $('distDiscount').value = '60';
    $('distQty').value = '100';
    $('distShippingUnit').value = '0.15';
    $('distReturns').value = '0';
    $('distOther').value = '0';

    $('amazonReferral').value = '15';
    $('amazonFba').value = '0';
    $('amazonInbound').value = '0';
    $('amazonStorage').value = '0';
    $('amazonAds').value = '0';
    $('amazonReturns').value = '0';
    $('amazonOther').value = '0';
    $('amazonMonthlyPlan').value = '25';
    $('amazonMonthlyUnits').value = '500';

    $('directPaymentPct').value = '0';
    $('directPaymentFixed').value = '0';
    $('directPostage').value = '0';
    $('directAds').value = '0';
    $('directReturns').value = '0';
    $('directOther').value = '0';

    $('targetMargin').value = '30';
    $('reservePct').value = '100';
    $('ignoreVat').checked = false;
    $('vatRate').disabled = false;

    const radio = document.querySelector(`input[name="channel"][value="${channel}"]`);
    if (radio) radio.checked = true;
    switchChannel(channel);
  }

  buildProductSelect();
  $('productSelect').value = 'bod';
  if (!restoreState()) applyProduct('bod');

  $('productSelect').addEventListener('change', (e) => applyProduct(e.target.value));
  document.querySelectorAll('input[name="channel"]').forEach(el =>
    el.addEventListener('change', () => switchChannel(currentChannel()))
  );
  inputs.forEach(id => $(id).addEventListener('input', calculate));
  $('ignoreVat').addEventListener('change', () => {
    $('vatRate').disabled = $('ignoreVat').checked;
    calculate();
  });
  $('resetBtn').addEventListener('click', resetCurrentProduct);
})();