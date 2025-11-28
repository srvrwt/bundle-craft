document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("bundle-products");
    const totalEl = document.getElementById("bundle-total");

    let selectedItems = [];

    // STEP 1: Fetch all store products  
    fetch("/products.json?limit=50")
        .then(res => res.json())
        .then(data => {
            const products = data.products;

            products.forEach(product => {
                const firstVariant = product.variants[0];

                const card = document.createElement("div");
                card.className = "bundle-product-card";

                card.innerHTML = `
          <img src="${product.images[0]?.src}" />
          <h4>${product.title}</h4>
          <p>Price: ₹${firstVariant.price}</p>
          <button class="select-btn" data-id="${firstVariant.id}" data-price="${firstVariant.price}">
            Add to Bundle
          </button>
        `;

                container.appendChild(card);
            });

            // STEP 2: Handle add to bundle
            document.querySelectorAll(".select-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.id;
                    const price = parseFloat(btn.dataset.price);

                    selectedItems.push({
                        id,
                        quantity: 1
                    });

                    updateTotal();
                    btn.textContent = "Added ✔";
                    btn.disabled = true;
                });
            });
        });

    // STEP 3: Update total price
    function updateTotal() {
        let total = 0;
        selectedItems.forEach(item => {
            const btn = document.querySelector(`[data-id="${item.id}"]`);
            total += parseFloat(btn.dataset.price);
        });
        totalEl.textContent = total.toFixed(2);
    }

    // STEP 4: Add bundle to cart
    document.getElementById("add-bundle").addEventListener("click", () => {
        if (selectedItems.length === 0) {
            alert("Select at least one item!");
            return;
        }

        fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: selectedItems
            })
        })
            .then(res => res.json())
            .then(() => {
                window.location.href = "/cart";
            });
    });
});
