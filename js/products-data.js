/* =========================================================
   Blooms & Flame Wax — default product catalogue (products-data.js)
   16 authentic studio photographs from D:\data in crisp .jpg format
   ========================================================= */
(function (root) {
  "use strict";
  var P = "assets/images/products/";
  var products = [
    { id: "aqua-rose", name: "Aqua Rose Bloom", category: "floral", image: P + "aqua-rose.jpg", badge: "Signature", featured: true,
      description: "A full-petal rose sculpted in calm turquoise wax, hand-finished in our Kattangudi studio so every fold catches the candlelight." },
    { id: "god-of-love", name: "God of Love Couple Rose", category: "love", image: P + "god-of-love.jpg", badge: "Gift pick", featured: true,
      description: "A romantic couple beneath a blooming rose, embossed with “God of Love” — a handmade keepsake candle for weddings and anniversaries." },
    { id: "tulip-bouquet", name: "Tulip Bouquet", category: "floral", image: P + "tulip-bouquet.jpg", badge: "New", featured: true,
      description: "A hand-poured bunch of crimson tulips on soft green stems — a sculpted wax bouquet that never wilts." },
    { id: "holding-hands-heart", name: "Holding Hands Heart", category: "love", image: P + "holding-hands-heart.jpg", featured: true,
      description: "Two hands clasped across an ivory heart. A gentle hand-poured candle for friendship, family and forever promises." },
    { id: "festive-diya-gift-box", name: "Festive Diya Gift Box", category: "festive", image: P + "festive-diya-gift-box.jpg", badge: "Festive", featured: true,
      description: "Six terracotta diyas filled with bright yellow, blue and pink wax, packed in a window gift box for Deepavali and celebrations." },
    { id: "mint-bubble-cube", name: "Mint Bubble Cube", category: "sculpted", image: P + "mint-bubble-cube.jpg", featured: true,
      description: "The playful bubble-cube silhouette in fresh mint — a modern sculptural accent poured in small batches." },
    { id: "peony-heart", name: "Peony Heart", category: "love", image: P + "peony-heart.jpg", featured: true,
      description: "Layered blush petals shaped into a heart, cast from our own studio silicone mould for crisp, lifelike detail." },
    { id: "pink-daisy", name: "Blush Daisy", category: "floral", image: P + "pink-daisy.jpg", featured: true,
      description: "A wide blush-pink daisy with a pearl-textured ivory centre — sweet as a floating or table centrepiece candle." },
    { id: "rose-in-hands-pillar", name: "Rose in Hands Pillar", category: "love", image: P + "rose-in-hands-pillar.jpg",
      description: "A sculpted red rose cradled by flowing hands — a statement pillar candle with fine hand-finished detail." },
    { id: "crimson-rosebud", name: "Crimson Rosebud", category: "floral", image: P + "crimson-rosebud.jpg",
      description: "A deep red rosebud poured in a single rich colour for a bold, classic look." },
    { id: "scarlet-lotus-bloom", name: "Scarlet Lotus", category: "floral", image: P + "scarlet-lotus-bloom.jpg",
      description: "Rounded lotus petals in rich scarlet wax — handcrafted for pooja corners and festive home décor." },
    { id: "ivory-daisy", name: "Ivory & Teal Daisy", category: "floral", image: P + "ivory-daisy.jpg",
      description: "Ribbed ivory petals around a teal centre, individually sealed at our studio for return gifting." },
    { id: "daffodil-cluster", name: "Spring Daffodil Cluster", category: "floral", image: P + "daffodil-cluster.jpg",
      description: "Twin daffodils in vivid spring green — a cheerful handmade bloom for event return gifts." },
    { id: "peach-bubble-sphere", name: "Peach Bubble Sphere", category: "sculpted", image: P + "peach-bubble-sphere.jpg",
      description: "A textured sphere of tiny peach pearls that glows warmly from within as it burns." },
    { id: "marigold-bubble-ball", name: "Marigold Bubble Ball", category: "sculpted", image: P + "marigold-bubble-ball.jpg",
      description: "A compact marigold-orange pearl ball — sized for festive favours and gift hampers." },
    { id: "terracotta-diya-box-6", name: "Terracotta Diya Box of 6", category: "festive", image: P + "terracotta-diya-box-6.jpg",
      description: "Handmade clay diyas filled with blue, green and pink wax, gift-wrapped and ready to light." }
  ];
  products.forEach(function (p, i) { p.price = ""; p.visible = true; p.sortOrder = (i + 1) * 10; });

  var categories = Object.freeze({
    floral: "Floral Blooms",
    love: "Love & Gifting",
    sculpted: "Sculpted Bubbles",
    festive: "Festive Diyas"
  });

  if (typeof module !== "undefined" && module.exports) module.exports = { products: products, categories: categories };
  else { root.BFW_PRODUCTS = Object.freeze(products.map(Object.freeze)); root.BFW_CATEGORIES = categories; }
})(typeof window !== "undefined" ? window : this);
