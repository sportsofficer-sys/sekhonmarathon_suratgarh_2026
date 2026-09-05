import QRCode from 'qrcode';
await QRCode.toFile('public/assets/payment-placeholder.svg',
 'SEKHON MARATHON SURATGARH 2026 — PAYMENT DETAILS YET TO UPDATE. This is a sample only. No payment destination is configured.',
 {type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:'#102c40',light:'#ffffff'}});
