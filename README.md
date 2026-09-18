# Gunpowder Studios Profit Calculator

A simple static profit and margin calculator for Gunpowder Studios board games.

## What it compares

- Distributor / wholesale deals, including an editable total discount from RRP, order quantity and game-specific pallet delivery
- Amazon UK, including referral fee, FBA, storage, inbound, advertising, returns and plan allocation
- Direct / website sales, including payment fees, postage, advertising and returns
- VAT is separated from contribution profit rather than treated as a normal cost
- A separate replenishment reserve shows cash-flow protection without double-counting manufacturing cost as accounting profit
- Target-margin calculation shows the maximum distributor discount or minimum selling price supported by the current cost assumptions

## Product presets

The game presets use the figures from the Gardners profitability sheet supplied by Gunpowder Studios. All values remain editable in the calculator.

Book of Dungeon is included with its £16.99 RRP and 0% VAT preset, but its print / landed costs must be entered before relying on its result.

## Amazon fee note

The Amazon UK Toys & Games referral fee is prefilled at 15%. FBA, storage, advertising and other Amazon costs vary by SKU and should be replaced with current Seller Central figures.

## GitHub Pages

This project is plain HTML, CSS and JavaScript and can be served directly with GitHub Pages from the repository root.


## Box Packer logistics

The distributor model now reuses the master-carton data from the Gunpowder Studios Box Packer. It stores games per carton plus carton dimensions and gross weight, then creates an editable planning estimate for cartons per pallet.

The pallet model is deliberately conservative and calibrated so Bag of Dungeon plans at 40 master cartons × 12 games = 480 games per pallet. UK-to-UK pallet delivery defaults to £80. For any real shipment, the cartons-per-pallet field remains editable so a physically confirmed pallet count can replace the estimate.

Distributor delivery per game is based on the actual order quantity: pallets required = ceiling(order quantity ÷ games per pallet), so a part-filled pallet is not incorrectly costed as though it were full.
