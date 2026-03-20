const MikroNode = require('mikronode');

function generateVoucher(user, duration){
  // Contoh dummy
  return {code: 'HOTSPOT-'+Math.floor(Math.random()*100000), duration};
}

module.exports = { generateVoucher };