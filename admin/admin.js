/* =========================================================
   SCENT CORNER ADMIN
   Main JavaScript
========================================================= */


/* =========================================================
   1. DOM HELPER
========================================================= */

const $ = (selector) => document.querySelector(selector);


/* =========================================================
   2. APPLICATION STATE
========================================================= */

let token = sessionStorage.getItem("shopAdminToken") || "";

let productsData = [];


/* =========================================================
   3. HELPER FUNCTIONS
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


function formatMoney(value) {

    return `GH₵${Math.round(Number(value) || 0).toLocaleString()}`;

}


function showError(message) {

    const errorElement = $("#appError");

    if (!errorElement) {
        console.error(message);
        return;
    }

    errorElement.textContent = message;

    setTimeout(() => {
        errorElement.textContent = "";
    }, 5000);

}


/* =========================================================
   4. API HELPER
========================================================= */

async function api(endpoint, options = {}) {

    const headers = {
        ...(options.headers || {})
    };


    /*
        Only send Authorization when we actually
        have a login token.
    */

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }


    const response = await fetch(endpoint, {
        ...options,
        headers
    });


    const data = await response
        .json()
        .catch(() => ({}));


    /*
        If the session has expired,
        log the admin out.
    */

    if (
        response.status === 401 &&
        !endpoint.includes("/login")
    ) {

        logout();

        throw new Error(
            data.error || "Your session has expired."
        );

    }


    /*
        Show the actual server error/status
        instead of only "Request failed."
    */

    if (!response.ok) {

        throw new Error(
            data.error ||
            `Request failed (${response.status}).`
        );

    }


    return data;

}


/* =========================================================
   5. JSON REQUEST HELPER
========================================================= */

function jsonRequest(method, body) {

    return {
        method,

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(body)
    };

}


/* =========================================================
   6. LOGIN / LOGOUT
========================================================= */

function showApplication() {

    const loggedIn = Boolean(token);


    $("#login").hidden = loggedIn;

    $("#app").hidden = !loggedIn;


    if (loggedIn) {

        loadStatistics();

        loadOrders();

        loadProducts();

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    token = "";

    sessionStorage.removeItem("shopAdminToken");

    showApplication();

}


/* =========================================================
   LOGOUT BUTTON
========================================================= */

$("#logoutButton").addEventListener(
    "click",
    logout
);


/* =========================================================
   LOGIN FORM
========================================================= */

$("#loginForm").addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            $("#email")
                .value
                .trim();


        const password =
            $("#password")
                .value;


        const loginError =
            $("#loginError");


        loginError.textContent = "";


        try {

            const data =
                await api(
                    "/api/auth/login",
                    jsonRequest(
                        "POST",
                        {
                            email,
                            password
                        }
                    )
                );


            /*
                Make sure the server actually
                returned a token.
            */

            if (!data.token) {

                throw new Error(
                    "Login succeeded, but no login token was returned."
                );

            }


            token = data.token;


            sessionStorage.setItem(
                "shopAdminToken",
                token
            );


            loginError.textContent = "";


            showApplication();

        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            loginError.textContent =
                error.message ||
                "Unable to log in.";

        }

    }
);


/* =========================================================
   7. TAB NAVIGATION
========================================================= */

document
    .querySelectorAll("[data-tab]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const selectedTab =
                    button.dataset.tab;


                document
                    .querySelectorAll("[data-tab]")
                    .forEach((tab) => {

                        const isActive =
                            tab === button;


                        tab.classList.toggle(
                            "active",
                            isActive
                        );


                        tab.setAttribute(
                            "aria-pressed",
                            String(isActive)
                        );

                    });


                $("#ordersSection").hidden =
                    selectedTab !== "orders";


                $("#productsSection").hidden =
                    selectedTab !== "products";


                $("#statusFilter").hidden =
                    selectedTab !== "orders";

            }
        );

    });


/* =========================================================
   8. DASHBOARD STATISTICS
========================================================= */

async function loadStatistics() {

    try {

        const statistics =
            await api(
                "/api/admin/stats"
            );


        const lowStockProducts =
            statistics.lowStock || [];


        const lowStockText =
            lowStockProducts.length

                ? lowStockProducts
                    .map(
                        (product) =>
                            `${escapeHTML(product.name)} (${product.stock})`
                    )
                    .join(", ")

                : "No low-stock products";


        $("#statistics").innerHTML = `

            <div class="stat-card">

                <span class="stat-value">
                    ${statistics.pendingOrders}
                </span>

                <span class="stat-label">
                    Pending Orders
                </span>

            </div>


            <div class="stat-card">

                <span class="stat-value">
                    ${statistics.totalOrders}
                </span>

                <span class="stat-label">
                    All Orders
                </span>

            </div>


            <div class="stat-card">

                <span class="stat-value">
                    ${formatMoney(
                        statistics.revenueDelivered
                    )}
                </span>

                <span class="stat-label">
                    Delivered Sales
                </span>

            </div>


            <div class="stat-card">

                <span class="stat-value">
                    ${lowStockProducts.length}
                </span>

                <span class="stat-label">
                    Low / Out of Stock
                </span>

                <div class="low-stock-list">
                    ${lowStockText}
                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            "Unable to load statistics:",
            error
        );

    }

}


/* =========================================================
   9. ORDERS
========================================================= */

async function loadOrders() {

    try {

        const status =
            $("#statusFilter").value;


        const endpoint =
            status

                ? `/api/admin/orders?status=${encodeURIComponent(status)}`

                : "/api/admin/orders";


        const orders =
            await api(endpoint);


        if (!orders.length) {

            $("#orders").innerHTML = `

                <p class="muted">

                    No orders yet.
                    New orders appear here as soon
                    as customers place them.

                </p>

            `;

            return;

        }


        $("#orders").innerHTML =
            orders
                .map(renderOrder)
                .join("");

    } catch (error) {

        showError(
            error.message
        );

    }

}


/* =========================================================
   10. RENDER AN ORDER
========================================================= */

function renderOrder(order) {

    const createdDate =
        new Date(
            order.createdAt.replace(
                " ",
                "T"
            ) + "Z"
        );


    const items =
        order.items
            .map(
                (item) => `

                    <div class="order-item">

                        <span>

                            ${escapeHTML(item.name)}

                            (${escapeHTML(item.size)})

                            ×${item.qty}

                        </span>


                        <span>

                            ${formatMoney(
                                item.lineTotal
                            )}

                        </span>

                    </div>

                `
            )
            .join("");


    const statusOptions =
        [
            "pending",
            "confirmed",
            "delivered",
            "cancelled"
        ]
            .map(
                (status) => `

                    <option
                        value="${status}"
                        ${
                            status === order.status
                                ? "selected"
                                : ""
                        }
                    >

                        ${status}

                    </option>

                `
            )
            .join("");


    return `

        <article class="card order-card">

            <div class="order-header">

                <strong class="order-code">

                    ${escapeHTML(order.code)}

                </strong>


                <span class="order-date">

                    ${createdDate.toLocaleString()}

                </span>


                <select
                    class="order-status"
                    data-order-id="${order.id}"
                    aria-label="Order status"
                >

                    ${statusOptions}

                </select>

            </div>


            <div class="order-customer">

                <strong>

                    ${escapeHTML(order.name)}

                </strong>

                ·

                <a
                    href="tel:${escapeHTML(order.phone)}"
                >

                    ${escapeHTML(order.phone)}

                </a>


                <br>


                <span class="muted">

                    ${escapeHTML(order.address)}

                </span>

            </div>


            <div>

                ${items}

            </div>


            <div class="row order-total">

                <strong>
                    Total
                </strong>


                <strong>

                    ${formatMoney(order.total)}

                </strong>

            </div>

        </article>

    `;

}


/* =========================================================
   11. ORDER STATUS FILTER
========================================================= */

$("#statusFilter").addEventListener(
    "change",
    loadOrders
);


/* =========================================================
   12. CHANGE ORDER STATUS
========================================================= */

$("#orders").addEventListener(
    "change",
    async (event) => {

        const select =
            event.target.closest(
                "[data-order-id]"
            );


        if (!select) {
            return;
        }


        const orderId =
            select.dataset.orderId;


        try {

            await api(
                `/api/admin/orders/${orderId}/status`,
                jsonRequest(
                    "PATCH",
                    {
                        status:
                            select.value
                    }
                )
            );


            await loadOrders();

            await loadStatistics();

            await loadProducts();

        } catch (error) {

            showError(
                error.message
            );

        }

    }
);


/* =========================================================
   13. LOAD PRODUCTS
========================================================= */

async function loadProducts() {

    try {

        productsData =
            await api(
                "/api/admin/products"
            );


        if (!productsData.length) {

            $("#productList").innerHTML = `

                <p class="muted">

                    No perfumes yet.
                    Add your first perfume above.

                </p>

            `;

            return;

        }


        $("#productList").innerHTML =
            productsData
                .map(renderProduct)
                .join("");

    } catch (error) {

        showError(
            error.message
        );

    }

}


/* =========================================================
   14. RENDER PRODUCT
========================================================= */

function renderProduct(product) {

    const sizes =
        product.sizes
            .map(
                (size) =>
                    `${escapeHTML(size.label)}
                     ${formatMoney(size.price)}`
            )
            .join(" · ");


    const hiddenBadge =
        product.active

            ? ""

            : `<span class="badge">Hidden</span>`;


    return `

        <article class="card product-card">

            <div class="row">

                <div>

                    <strong class="product-name">

                        ${escapeHTML(product.brand)}

                        ${escapeHTML(product.name)}

                    </strong>


                    ${hiddenBadge}


                    <div class="product-details">

                        ${sizes}

                        ·

                        ${product.stock} in stock

                    </div>

                </div>


                <div class="product-actions">

                    <button
                        data-edit-product="${product.id}"
                        class="button"
                    >

                        Edit

                    </button>


                    <button
                        data-delete-product="${product.id}"
                        class="button button-danger"
                    >

                        Delete

                    </button>

                </div>

            </div>

        </article>

    `;

}


/* =========================================================
   15. NEW PRODUCT
========================================================= */

$("#newProductButton").addEventListener(
    "click",
    () => {

        openProductForm();

    }
);


/* =========================================================
   16. PRODUCT ACTIONS
========================================================= */

$("#productList").addEventListener(
    "click",
    async (event) => {

        const editButton =
            event.target.closest(
                "[data-edit-product]"
            );


        const deleteButton =
            event.target.closest(
                "[data-delete-product]"
            );


        /* -----------------------------------------
           EDIT
        ----------------------------------------- */

        if (editButton) {

            const product =
                productsData.find(
                    (item) =>
                        item.id ==
                        editButton.dataset.editProduct
                );


            if (product) {

                openProductForm(
                    product
                );

            }

        }


        /* -----------------------------------------
           DELETE
        ----------------------------------------- */

        if (deleteButton) {

            const productId =
                deleteButton.dataset.deleteProduct;


            const confirmed =
                confirm(
                    "Delete this perfume? Past orders will keep their existing details."
                );


            if (!confirmed) {
                return;
            }


            try {

                await api(
                    `/api/admin/products/${productId}`,
                    {
                        method: "DELETE"
                    }
                );


                await loadProducts();

                await loadStatistics();

            } catch (error) {

                showError(
                    error.message
                );

            }

        }

    }
);


/* =========================================================
   17. PRODUCT FORM
========================================================= */

function openProductForm(
    product = null
) {

    const isEditing =
        Boolean(product);


    const data =
        product || {

            brand: "",

            name: "",

            category: "Unisex",

            notes: [],

            description: "",

            color: "#7a3f9a",

            shape: 0,

            sizes: [

                {
                    label: "50ml",
                    price: ""
                }

            ],

            stock: 0,

            active: true

        };


    const sizesText =
        data.sizes
            .map(
                (size) =>
                    `${size.label}: ${size.price}`
            )
            .join("\n");


    $("#productForm").innerHTML = `

        <div class="card product-form">

            <h2>

                ${
                    isEditing
                        ? "Edit Perfume"
                        : "Add a Perfume"
                }

            </h2>


            <div class="form-grid">


                <!-- BRAND -->

                <div class="form-group">

                    <label for="productBrand">

                        Brand

                    </label>


                    <input
                        id="productBrand"
                        value="${escapeHTML(data.brand)}"
                    >

                </div>


                <!-- NAME -->

                <div class="form-group">

                    <label for="productName">

                        Name

                    </label>


                    <input
                        id="productName"
                        value="${escapeHTML(data.name)}"
                    >

                </div>


                <!-- CATEGORY -->

                <div class="form-group">

                    <label for="productCategory">

                        Category

                    </label>


                    <select id="productCategory">

                        ${[
                            "Men",
                            "Women",
                            "Unisex"
                        ]
                            .map(
                                (category) => `

                                    <option
                                        value="${category}"
                                        ${
                                            category ===
                                            data.category
                                                ? "selected"
                                                : ""
                                        }
                                    >

                                        ${category}

                                    </option>

                                `
                            )
                            .join("")}

                    </select>

                </div>


                <!-- NOTES -->

                <div class="form-group">

                    <label for="productNotes">

                        Scent Notes

                    </label>


                    <input
                        id="productNotes"
                        value="${escapeHTML(
                            data.notes.join(", ")
                        )}"
                        placeholder="Vanilla, Rose, Musk"
                    >

                </div>


                <!-- SIZES -->

                <div class="form-group">

                    <label for="productSizes">

                        Sizes & Prices

                    </label>


                    <textarea
                        id="productSizes"
                        rows="4"
                        placeholder="50ml: 650&#10;100ml: 950"
                    >${escapeHTML(sizesText)}</textarea>


                    <small class="muted">

                        Enter one size per line.

                    </small>

                </div>


                <!-- STOCK -->

                <div class="form-group">

                    <label for="productStock">

                        In Stock

                    </label>


                    <input
                        id="productStock"
                        type="number"
                        min="0"
                        value="${data.stock}"
                    >

                </div>


                <!-- COLOUR -->

                <div class="form-group">

                    <label for="productColor">

                        Bottle Colour

                    </label>


                    <input
                        id="productColor"
                        type="color"
                        value="${data.color}"
                    >

                </div>


                <!-- SHAPE -->

                <div class="form-group">

                    <label for="productShape">

                        Bottle Shape

                    </label>


                    <select id="productShape">

                        ${[
                            "Square cap",
                            "Round",
                            "Tall"
                        ]
                            .map(
                                (shape, index) => `

                                    <option
                                        value="${index}"
                                        ${
                                            index ===
                                            data.shape
                                                ? "selected"
                                                : ""
                                        }
                                    >

                                        ${shape}

                                    </option>

                                `
                            )
                            .join("")}

                    </select>

                </div>


                <!-- IMAGE -->

                <div class="form-group">

                    <label for="productImage">

                        Product Photo

                    </label>


                    <input
                        id="productImage"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                    >


                    <small class="muted">

                        JPG, PNG or WebP.
                        Maximum 2MB.

                    </small>

                </div>


                <!-- ACTIVE -->

                <div class="form-group">

                    <label class="checkbox">

                        <input
                            id="productActive"
                            type="checkbox"
                            ${
                                data.active
                                    ? "checked"
                                    : ""
                            }
                        >


                        <span>

                            Show on the shop

                        </span>

                    </label>

                </div>

            </div>


            <!-- DESCRIPTION -->

            <div class="form-group">

                <label for="productDescription">

                    Description

                </label>


                <textarea
                    id="productDescription"
                    rows="3"
                >${escapeHTML(data.description)}</textarea>

            </div>


            <p
                id="productFormError"
                class="error"
                role="alert"
            ></p>


            <div class="form-actions">

                <button
                    id="saveProductButton"
                    class="button button-primary"
                >

                    Save

                </button>


                <button
                    id="cancelProductButton"
                    class="button"
                >

                    Cancel

                </button>

            </div>

        </div>

    `;


    /* -----------------------------------------
       CANCEL
    ----------------------------------------- */

    $("#cancelProductButton").onclick =
        () => {

            $("#productForm").innerHTML = "";

        };


    /* -----------------------------------------
       SAVE
    ----------------------------------------- */

    $("#saveProductButton").onclick =
        () => saveProduct(data);


    $("#productForm").scrollIntoView({
        behavior: "smooth"
    });

}


/* =========================================================
   18. SAVE PRODUCT
========================================================= */

async function saveProduct(
    existingProduct
) {

    const isEditing =
        Boolean(existingProduct.id);


    try {

        /* -----------------------------------------
           PARSE SIZES
        ----------------------------------------- */

        const sizes =
            $("#productSizes")
                .value
                .split("\n")

                .map(
                    (line) =>
                        line.trim()
                )

                .filter(Boolean)

                .map(
                    (line) => {

                        const [
                            label,
                            ...priceParts
                        ] =
                            line.split(":");


                        return {

                            label:
                                label.trim(),

                            price:
                                Number(
                                    priceParts
                                        .join(":")
                                        .trim()
                                )

                        };

                    }
                );


        /* -----------------------------------------
           PRODUCT DATA
        ----------------------------------------- */

        const productData = {

            brand:
                $("#productBrand")
                    .value
                    .trim(),


            name:
                $("#productName")
                    .value
                    .trim(),


            category:
                $("#productCategory")
                    .value,


            notes:
                $("#productNotes")
                    .value
                    .split(",")

                    .map(
                        (note) =>
                            note.trim()
                    )

                    .filter(Boolean),


            description:
                $("#productDescription")
                    .value
                    .trim(),


            color:
                $("#productColor")
                    .value,


            shape:
                Number(
                    $("#productShape")
                        .value
                ),


            sizes,


            stock:
                Number(
                    $("#productStock")
                        .value
                ),


            active:
                $("#productActive")
                    .checked

        };


        /* -----------------------------------------
           ENDPOINT
        ----------------------------------------- */

        const endpoint =
            isEditing

                ? `/api/admin/products/${existingProduct.id}`

                : "/api/admin/products";


        /* -----------------------------------------
           HTTP METHOD
        ----------------------------------------- */

        const method =
            isEditing
                ? "PUT"
                : "POST";


        /* -----------------------------------------
           SAVE PRODUCT
        ----------------------------------------- */

        const savedProduct =
            await api(
                endpoint,
                jsonRequest(
                    method,
                    productData
                )
            );


        /* -----------------------------------------
           UPLOAD IMAGE
        ----------------------------------------- */

        const image =
            $("#productImage")
                .files[0];


        if (image) {

            const formData =
                new FormData();


            formData.append(
                "image",
                image
            );


            await api(
                `/api/admin/products/${savedProduct.id}/image`,
                {
                    method: "POST",
                    body: formData
                }
            );

        }


        /* -----------------------------------------
           FINISH
        ----------------------------------------- */

        $("#productForm").innerHTML = "";


        await loadProducts();

        await loadStatistics();

    } catch (error) {

        const errorElement =
            $("#productFormError");


        if (errorElement) {

            errorElement.textContent =
                error.message;

        } else {

            showError(
                error.message
            );

        }

    }

}


/* =========================================================
   19. START APPLICATION
========================================================= */

showApplication();