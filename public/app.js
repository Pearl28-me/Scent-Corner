/* =========================================================
   SCENT CORNER
   Customer Shop JavaScript
========================================================= */


/* =========================================================
   1. APPLICATION STATE
========================================================= */

let SHOP = {
    name: "Scent Corner",
    whatsapp: "",
    currency: "GH₵"
};


let PRODUCTS = [];

let cart = [];

let selectedCategory = "All";

let temporarySelection = {};


/* =========================================================
   2. DOM HELPER
========================================================= */

const $ = (selector) =>
    document.querySelector(selector);


/* =========================================================
   3. HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,

        (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character])
    );

}


/* =========================================================
   4. MONEY FORMATTER
========================================================= */

function formatMoney(value) {

    return (
        SHOP.currency +
        Math.round(
            Number(value) || 0
        ).toLocaleString()
    );

}


/* =========================================================
   5. API HELPER
========================================================= */

async function api(endpoint, options = {}) {

    const response =
        await fetch(
            endpoint,
            options
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Something went wrong. Please try again."
        );

    }


    return data;

}


/* =========================================================
   6. SVG PERFUME BOTTLE
========================================================= */

function createBottle(color, shape, uniqueId) {

    const gradientId =
        `gradient-${uniqueId}`;


    const shapes = [

        /* Square bottle */

        `
        <rect
            x="40"
            y="70"
            width="80"
            height="110"
            rx="14"
            fill="url(#${gradientId})"
            stroke="currentColor"
            stroke-opacity=".25"
        />

        <rect
            x="70"
            y="40"
            width="20"
            height="30"
            fill="#B0802F"
        />

        <rect
            x="62"
            y="18"
            width="36"
            height="24"
            rx="6"
            fill="#2a2036"
        />
        `,


        /* Round bottle */

        `
        <path
            d="
                M52 180
                Q36 180 36 160
                L36 100
                Q36 78 60 74
                L60 56
                H100
                V74
                Q124 78 124 100
                V160
                Q124 180 108 180
                Z
            "
            fill="url(#${gradientId})"
            stroke="currentColor"
            stroke-opacity=".25"
        />

        <rect
            x="64"
            y="24"
            width="32"
            height="34"
            rx="16"
            fill="#B0802F"
        />
        `,


        /* Tall bottle */

        `
        <rect
            x="46"
            y="62"
            width="68"
            height="118"
            rx="5"
            fill="url(#${gradientId})"
            stroke="currentColor"
            stroke-opacity=".25"
        />

        <rect
            x="66"
            y="42"
            width="28"
            height="22"
            fill="#B0802F"
        />

        <rect
            x="58"
            y="14"
            width="44"
            height="30"
            rx="3"
            fill="#2a2036"
        />
        `

    ];


    const x =
        shape === 1
            ? 52
            : shape === 0
                ? 52
                : 58;


    const labelWidth =
        shape === 2
            ? 44
            : 56;


    const labelX =
        shape === 2
            ? 58
            : 52;


    return `

        <svg
            viewBox="0 0 160 200"
            aria-hidden="true"
        >

            <defs>

                <linearGradient
                    id="${gradientId}"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >

                    <stop
                        offset="0"
                        stop-color="${escapeHTML(color)}"
                        stop-opacity=".95"
                    />

                    <stop
                        offset="1"
                        stop-color="${escapeHTML(color)}"
                        stop-opacity=".55"
                    />

                </linearGradient>

            </defs>


            ${shapes[shape]}


            <!-- Bottle label -->

            <rect
                x="${labelX}"
                y="112"
                width="${labelWidth}"
                height="38"
                rx="3"
                fill="#ffffff"
                fill-opacity=".85"
            />


            <rect
                x="${shape === 2 ? 66 : 62}"
                y="124"
                width="${shape === 2 ? 28 : 36}"
                height="3"
                fill="#2a2036"
                fill-opacity=".6"
            />


            <rect
                x="${shape === 2 ? 70 : 68}"
                y="132"
                width="${shape === 2 ? 20 : 24}"
                height="2"
                fill="#2a2036"
                fill-opacity=".35"
            />


            <!-- Highlight -->

            <path
                d="M${shape === 2 ? 54 : 46} 78 V170"
                stroke="#ffffff"
                stroke-opacity=".35"
                stroke-width="3"
                stroke-linecap="round"
            />

        </svg>

    `;

}


/* =========================================================
   7. PRODUCT ART
========================================================= */

function productArt(product, uniqueId) {

    if (product.image) {

        return `
            <img
                src="${escapeHTML(product.image)}"
                alt="${escapeHTML(
                    product.brand + " " + product.name
                )}"
                loading="lazy"
            >
        `;

    }


    return createBottle(
        product.color,
        product.shape,
        uniqueId
    );

}


/* =========================================================
   8. PRODUCT HELPERS
========================================================= */

function findProduct(id) {

    return PRODUCTS.find(
        product =>
            product.id == id
    );

}


function getUnitPrice(item) {

    const product =
        findProduct(item.id);


    if (!product) {
        return 0;
    }


    const size =
        product.sizes.find(
            itemSize =>
                itemSize.label == item.size
        );


    return size
        ? size.price
        : 0;

}


function getCartQuantity(productId) {

    return cart
        .filter(
            item =>
                item.id == productId
        )
        .reduce(
            (total, item) =>
                total + item.quantity,
            0
        );

}


/* =========================================================
   9. LOCAL STORAGE
========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );

    } catch (error) {

        console.warn(
            "Unable to save cart.",
            error
        );

    }

}


/* =========================================================
   10. INITIAL PAGE DATA
========================================================= */

$("#yr").textContent =
    new Date().getFullYear();


/* =========================================================
   11. CATEGORY CHIPS
========================================================= */

function renderCategories() {

    const categories = [
        "All",
        ...new Set(
            PRODUCTS.map(
                product =>
                    product.category
            )
        )
    ];


    $("#chips").innerHTML =
        categories
            .map(
                category => `

                    <button
                        class="chip"
                        type="button"
                        aria-pressed="${category === selectedCategory}"
                        data-category="${escapeHTML(category)}"
                    >
                        ${escapeHTML(category)}
                    </button>

                `
            )
            .join("");

}


/* =========================================================
   12. RENDER PRODUCTS
========================================================= */

function renderProducts() {

    const search =
        $("#q")
            .value
            .trim()
            .toLowerCase();


    const sort =
        $("#sort").value;


    const startingPrice =
        product =>
            Math.min(
                ...product.sizes.map(
                    size =>
                        size.price
                )
            );


    let filteredProducts =
        PRODUCTS.filter(
            product => {

                const matchesCategory =
                    selectedCategory === "All" ||
                    product.category ===
                        selectedCategory;


                const searchableText =
                    [
                        product.brand,
                        product.name,
                        ...product.notes
                    ]
                        .join(" ")
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                return (
                    matchesCategory &&
                    matchesSearch
                );

            }
        );


    /* Sort */

    if (sort === "lo") {

        filteredProducts.sort(
            (a, b) =>
                startingPrice(a) -
                startingPrice(b)
        );

    }


    if (sort === "hi") {

        filteredProducts.sort(
            (a, b) =>
                startingPrice(b) -
                startingPrice(a)
        );

    }


    /* No results */

    if (!filteredProducts.length) {

        $("#grid").innerHTML = `

            <p class="empty">

                ${
                    PRODUCTS.length

                        ? "No perfumes match that search. Try a different note or clear the filter."

                        : "New perfumes are coming soon. Check back shortly."
                }

            </p>

        `;

        return;

    }


    /* Product cards */

    $("#grid").innerHTML =
        filteredProducts
            .map(
                product => {

                    const price =
                        startingPrice(
                            product
                        );


                    return `

                        <button
                            class="card ${
                                product.stock
                                    ? ""
                                    : "out"
                            }"
                            type="button"
                            data-product-id="${product.id}"
                            aria-label="View ${escapeHTML(
                                product.brand +
                                " " +
                                product.name
                            )}"
                        >

                            <div class="art">

                                ${productArt(
                                    product,
                                    `card-${product.id}`
                                )}

                            </div>


                            <div class="info">

                                <small>
                                    ${escapeHTML(
                                        product.brand
                                    )}
                                </small>


                                <h3>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </h3>


                                <small>
                                    ${escapeHTML(
                                        product.notes.join(
                                            ", "
                                        )
                                    )}
                                </small>


                                <span class="price">

                                    ${
                                        product.stock

                                            ? `From ${formatMoney(price)}`

                                            : "Sold out"
                                    }

                                </span>

                            </div>

                        </button>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   13. CATEGORY EVENTS
========================================================= */

$("#chips").addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-category]"
            );


        if (!button) {
            return;
        }


        selectedCategory =
            button.dataset.category;


        renderCategories();
        renderProducts();

    }
);


/* =========================================================
   14. SEARCH & SORT
========================================================= */

$("#q").addEventListener(
    "input",
    renderProducts
);


$("#sort").addEventListener(
    "change",
    renderProducts
);


/* =========================================================
   15. PRODUCT MODAL
========================================================= */

function openOverlay(element) {

    $("#shade").classList.add("on");

    element.classList.add("on");

}


function closeAll() {

    $("#shade").classList.remove("on");

    $("#drawer").classList.remove("on");

    $("#modal").classList.remove("on");

}


$("#shade").addEventListener(
    "click",
    closeAll
);


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeAll();

        }

    }
);


document
    .querySelectorAll("[data-close]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                closeAll
            );

        }
    );


/* Open product */

$("#grid").addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-product-id]"
            );


        if (!button) {
            return;
        }


        openProductModal(
            Number(
                button.dataset.productId
            )
        );

    }
);


/* =========================================================
   16. PRODUCT MODAL CONTENT
========================================================= */

function openProductModal(id) {

    const product =
        findProduct(id);


    if (!product) {
        return;
    }


    temporarySelection = {
        size:
            product.sizes[0].label
    };


    $("#modalArt").innerHTML =
        productArt(
            product,
            `modal-${id}`
        );


    renderProductModal(
        product
    );


    openOverlay(
        $("#modal")
    );

}


/* =========================================================
   17. RENDER PRODUCT MODAL
========================================================= */

function renderProductModal(product) {

    $("#modalBody").innerHTML = `

        <button
            class="close-button"
            type="button"
            aria-label="Close"
            id="closeProductModal"
        >
            ×
        </button>


        <small class="muted">
            ${escapeHTML(product.brand)}
            ·
            ${escapeHTML(product.category)}
        </small>


        <h2>
            ${escapeHTML(product.name)}
        </h2>


        <div class="notes">

            ${product.notes
                .map(
                    note => `
                        <span>
                            ${escapeHTML(note)}
                        </span>
                    `
                )
                .join("")}

        </div>


        <p class="muted">

            ${escapeHTML(
                product.description
            )}

        </p>


        <div class="sizes">

            ${product.sizes
                .map(
                    size => `

                        <button
                            class="chip"
                            type="button"
                            aria-pressed="${
                                size.label ===
                                temporarySelection.size
                            }"
                            data-size="${escapeHTML(
                                size.label
                            )}"
                        >

                            ${escapeHTML(
                                size.label
                            )}

                            ·

                            ${formatMoney(
                                size.price
                            )}

                        </button>

                    `
                )
                .join("")}

        </div>


        ${
            product.stock

                ? `

                    <button
                        class="btn"
                        type="button"
                        id="addToCart"
                    >
                        Add to cart
                    </button>

                    ${
                        product.stock <= 3

                            ? `
                                <span class="stock-tag">
                                    Only ${product.stock} left
                                </span>
                              `

                            : ""
                    }

                  `

                : `

                    <button
                        class="btn"
                        type="button"
                        disabled
                        style="opacity:.5"
                    >
                        Sold out
                    </button>

                  `
        }

    `;


    /* Close modal */

    $("#closeProductModal").onclick =
        closeAll;


    /* Size selection */

    $("#modalBody")
        .querySelectorAll(
            "[data-size]"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        temporarySelection.size =
                            button.dataset.size;

                        renderProductModal(
                            product
                        );

                    };

            }
        );


    /* Add to cart */

    const addButton =
        $("#addToCart");


    if (addButton) {

        addButton.onclick =
            () => {

                const added =
                    addItem(
                        product.id,
                        temporarySelection.size
                    );


                if (added) {

                    closeAll();

                }

            };

    }

}


/* =========================================================
   18. ADD TO CART
========================================================= */

function addItem(
    productId,
    size
) {

    const product =
        findProduct(productId);


    if (!product) {
        return false;
    }


    const currentQuantity =
        getCartQuantity(
            productId
        );


    if (
        currentQuantity >=
        product.stock
    ) {

        showToast(
            `Only ${product.stock} available`
        );

        return false;

    }


    const existingItem =
        cart.find(
            item =>
                item.id == productId &&
                item.size == size
        );


    if (existingItem) {

        existingItem.quantity++;

    } else {

        cart.push({

            id: productId,

            size,

            quantity: 1

        });

    }


    saveCart();

    renderCart();

    showToast(
        "Added to cart"
    );


    return true;

}


/* =========================================================
   19. CART TOTAL
========================================================= */

function getCartTotal() {

    return cart.reduce(
        (total, item) =>
            total +
            getUnitPrice(item) *
            item.quantity,

        0
    );

}


/* =========================================================
   20. RENDER CART
========================================================= */

function renderCart() {

    const quantity =
        cart.reduce(
            (total, item) =>
                total + item.quantity,

            0
        );


    $("#cartCount").textContent =
        quantity;


    /* Empty cart */

    if (!cart.length) {

        $("#lines").innerHTML = `

            <p class="empty">

                Your cart is empty.
                Pick a perfume from the collection
                to start.

            </p>

        `;

        $("#checkout").innerHTML = "";

        return;

    }


    /* Cart items */

    $("#lines").innerHTML =
        cart
            .map(
                (item, index) => {

                    const product =
                        findProduct(
                            item.id
                        );


                    if (!product) {
                        return "";
                    }


                    const unitPrice =
                        getUnitPrice(
                            item
                        );


                    return `

                        <div class="cart-line">

                            <div class="art">

                                ${productArt(
                                    product,
                                    `cart-${index}`
                                )}

                            </div>


                            <div>

                                <strong>
                                    ${escapeHTML(
                                        product.brand +
                                        " " +
                                        product.name
                                    )}
                                </strong>


                                <br>


                                <small class="muted">

                                    ${escapeHTML(
                                        item.size
                                    )}

                                    ·

                                    ${formatMoney(
                                        unitPrice
                                    )}

                                </small>


                                <br>


                                <span class="cart-quantity">

                                    <button
                                        type="button"
                                        data-action="decrease"
                                        data-index="${index}"
                                        aria-label="Decrease quantity"
                                    >
                                        −
                                    </button>


                                    ${item.quantity}


                                    <button
                                        type="button"
                                        data-action="increase"
                                        data-index="${index}"
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>

                                </span>

                            </div>


                            <strong>

                                ${formatMoney(
                                    unitPrice *
                                    item.quantity
                                )}

                            </strong>

                        </div>

                    `;

                }
            )
            .join("");


    /* Checkout */

    $("#checkout").innerHTML = `

        <div class="cart-row">

            <span>
                Total
            </span>

            <strong style="font-size:22px">

                ${formatMoney(
                    getCartTotal()
                )}

            </strong>

        </div>


        <div class="checkout-form">

            <input
                id="customerName"
                placeholder="Your name"
                autocomplete="name"
            >


            <input
                id="customerPhone"
                placeholder="Phone number"
                inputmode="tel"
                autocomplete="tel"
            >


            <textarea
                id="customerAddress"
                rows="2"
                placeholder="Delivery address or area"
            ></textarea>

        </div>


        <p
            id="checkoutError"
            class="error-message"
            role="alert"
        ></p>


        <button
            class="btn"
            id="placeOrder"
            type="button"
            style="width:100%;margin-top:12px"
        >
            Place order
        </button>


        <p class="muted checkout-note">

            You pay on delivery.
            We'll confirm availability on WhatsApp.

        </p>

    `;


    $("#placeOrder").onclick =
        placeOrder;

}


/* =========================================================
   21. CART QUANTITY CONTROLS
========================================================= */

$("#lines").addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) {
            return;
        }


        const index =
            Number(
                button.dataset.index
            );


        const action =
            button.dataset.action;


        const item =
            cart[index];


        if (!item) {
            return;
        }


        const product =
            findProduct(
                item.id
            );


        if (!product) {
            return;
        }


        /* Increase */

        if (
            action === "increase"
        ) {

            if (
                getCartQuantity(
                    item.id
                ) >= product.stock
            ) {

                showToast(
                    "No more in stock"
                );

                return;

            }


            item.quantity++;

        }


        /* Decrease */

        if (
            action === "decrease"
        ) {

            item.quantity--;

            if (
                item.quantity < 1
            ) {

                cart.splice(
                    index,
                    1
                );

            }

        }


        saveCart();

        renderCart();

    }
);


/* =========================================================
   22. PLACE ORDER
========================================================= */

async function placeOrder() {

    const name =
        $("#customerName")
            .value
            .trim();


    const phone =
        $("#customerPhone")
            .value
            .trim();


    const address =
        $("#customerAddress")
            .value
            .trim();


    const button =
        $("#placeOrder");


    const error =
        $("#checkoutError");


    /* Validate */

    if (
        !name ||
        !phone ||
        !address
    ) {

        error.textContent =
            "Enter your name, phone number and delivery address to place the order.";

        return;

    }


    button.disabled = true;

    button.textContent =
        "Placing order…";


    try {

        /* Send order to backend */

        const order =
            await api(
                "/api/orders",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            phone,

                            address,

                            items:
                                cart.map(
                                    item => ({

                                        productId:
                                            item.id,

                                        size:
                                            item.size,

                                        qty:
                                            item.quantity

                                    })
                                )

                        })

                }
            );


        /* Build WhatsApp message */

        const orderLines =
            order.items
                .map(
                    item =>

                        `• ${item.name} (${item.size}) x${item.qty} = ${formatMoney(item.lineTotal)}`
                )
                .join("\n");


        const message =

            `Hello ${SHOP.name}, I just placed order ${order.code}:\n\n` +

            `${orderLines}\n\n` +

            `Total: ${formatMoney(order.total)}\n` +

            `Name: ${name}\n` +

            `Phone: ${phone}\n` +

            `Delivery: ${address}`;


        /* Clear cart */

        cart = [];

        saveCart();


        $("#cartCount").textContent =
            "0";


        /* Success message */

        $("#lines").innerHTML = `

            <div class="order-complete">

                <h3>
                    Order ${escapeHTML(order.code)}
                    received
                </h3>


                <p class="muted">

                    Send it on WhatsApp so we
                    can confirm your delivery time.

                </p>


                <a
                    class="btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}"
                >
                    Confirm on WhatsApp
                </a>

            </div>

        `;


        $("#checkout").innerHTML = "";


        /* Refresh product stock */

        await loadProducts();


    } catch (error) {

        errorMessage(
            error.message
        );


        button.disabled = false;

        button.textContent =
            "Place order";

    }

}


/* =========================================================
   23. ERROR MESSAGE HELPER
========================================================= */

function errorMessage(message) {

    const element =
        $("#checkoutError");


    if (element) {

        element.textContent =
            message;

    }

}


/* =========================================================
   24. OPEN CART
========================================================= */

$("#openCart").addEventListener(
    "click",
    () => {

        renderCart();

        openOverlay(
            $("#drawer")
        );

    }
);


/* =========================================================
   25. TOAST
========================================================= */

let toastTimer;


function showToast(message) {

    const toast =
        $("#toast");


    toast.textContent =
        message;


    toast.classList.add(
        "on"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "on"
                );

            },
            2000
        );

}


/* =========================================================
   26. LOAD PRODUCTS
========================================================= */

async function loadProducts() {

    PRODUCTS =
        await api(
            "/api/products"
        );


    /*
        Remove cart items that
        no longer have a valid price.
    */

    cart =
        cart.filter(
            item =>
                getUnitPrice(item) > 0
        );


    renderCategories();

    renderProducts();

}


/* =========================================================
   27. LOAD SHOP CONFIGURATION
========================================================= */

async function loadShop() {

    SHOP =
        await api(
            "/api/config"
        );


    document.title =
        `${SHOP.name} – Authentic Designer Perfumes`;


    $(".logo").textContent =
        SHOP.name;


    $("#brandName").textContent =
        SHOP.name;


    $("#waLink").href =
        `https://wa.me/${SHOP.whatsapp}?text=` +
        encodeURIComponent(
            "Hello, I'd like help choosing a perfume."
        );

}


/* =========================================================
   28. INITIALIZE SHOP
========================================================= */

async function initializeShop() {

    /* Load saved cart */

    try {

        cart =
            JSON.parse(
                localStorage.getItem(
                    "cart"
                ) || "[]"
            );

    } catch (error) {

        cart = [];

    }


    try {

        await loadShop();

        await loadProducts();

        saveCart();

        renderCart();

    } catch (error) {

        console.error(
            "Shop initialization failed:",
            error
        );


        $("#grid").innerHTML = `

            <p class="empty">

                The shop couldn't load.
                Refresh the page to try again.

            </p>

        `;

    }

}


/* =========================================================
   29. START
========================================================= */

initializeShop();