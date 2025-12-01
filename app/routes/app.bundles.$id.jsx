import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);

  const bundle = await prisma.bundle.findUnique({
    where: { id: params.id },
    include: { products: true },
  });

  if (!bundle || bundle.shop !== session.shop) {
    throw new Response("Not Found", { status: 404 });
  }
  const productsResponse = await admin.graphql(
    `#graphql
      query {
        products(first: 50) {
          edges {
            node {
              id
              title
              featuredImage {
                url
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }`,
  );

  const productsData = await productsResponse.json();
  const shopifyProducts = productsData.data.products.edges.map(
    (edge) => edge.node,
  );

  return { bundle, shopifyProducts };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "update") {
    await prisma.bundle.update({
      where: { id: params.id },
      data: {
        title: formData.get("title"),
        description: formData.get("description"),
        discountType: formData.get("discountType"),
        discountValue: parseFloat(formData.get("discountValue") || 0),
        minProducts: parseInt(formData.get("minProducts") || 2),
        maxProducts: parseInt(formData.get("maxProducts") || 5),
        status: formData.get("status"),
      },
    });
  } else if (actionType === "addProduct") {
    const productData = JSON.parse(formData.get("productData"));

    await prisma.bundleProduct.create({
      data: {
        bundleId: params.id,
        productId: productData.productId,
        variantId: productData.variantId,
        productTitle: productData.title,
        productImage: productData.image,
        price: parseFloat(productData.price),
        compareAtPrice: productData.compareAtPrice
          ? parseFloat(productData.compareAtPrice)
          : null,
      },
    });
  } else if (actionType === "removeProduct") {
    await prisma.bundleProduct.delete({
      where: { id: formData.get("productId") },
    });
  }

  return { success: true };
};

export default function EditBundle() {
  const { bundle, shopifyProducts } = useLoaderData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: bundle.title,
    description: bundle.description || "",
    discountType: bundle.discountType,
    discountValue: bundle.discountValue.toString(),
    minProducts: bundle.minProducts.toString(),
    maxProducts: bundle.maxProducts.toString(),
    status: bundle.status,
  });

  const [showProductPicker, setShowProductPicker] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("_action", "update");
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    await fetch(`/app/bundles/${bundle.id}`, {
      method: "POST",
      body: data,
    });

    alert("Bundle updated!");
  };

  const handleAddProduct = async (product) => {
    const variant = product.variants.edges[0].node;

    const data = new FormData();
    data.append("_action", "addProduct");
    data.append(
      "productData",
      JSON.stringify({
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        image: product.featuredImage?.url || null,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
      }),
    );

    await fetch(`/app/bundles/${bundle.id}`, {
      method: "POST",
      body: data,
    });

    window.location.reload();
  };

  const handleRemoveProduct = async (productId) => {
    const data = new FormData();
    data.append("_action", "removeProduct");
    data.append("productId", productId);

    await fetch(`/app/bundles/${bundle.id}`, {
      method: "POST",
      body: data,
    });

    window.location.reload();
  };

  return (
    <s-page
      heading={`Edit Bundle: ${bundle.title}`}
      backAction={{ onClick: () => navigate("/app") }}
    >
      <s-section heading="Bundle Details">
        <form onSubmit={handleUpdate}>
          <s-stack direction="block" gap="large">
            <s-text-field
              label="Bundle Name"
              value={formData.title}
              onInput={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />

            <s-text-field
              label="Description"
              value={formData.description}
              onInput={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline="3"
            />

            <s-select
              label="Discount Type"
              value={formData.discountType}
              onChange={(e) =>
                setFormData({ ...formData, discountType: e.target.value })
              }
            >
              <option value="percentage">Percentage Off</option>
              <option value="fixed">Fixed Amount Off</option>
              <option value="none">No Discount</option>
            </s-select>

            {formData.discountType !== "none" && (
              <s-text-field
                label={
                  formData.discountType === "percentage"
                    ? "Discount Percentage"
                    : "Discount Amount ($)"
                }
                type="number"
                value={formData.discountValue}
                onInput={(e) =>
                  setFormData({ ...formData, discountValue: e.target.value })
                }
                min="0"
              />
            )}

            <s-stack direction="inline" gap="base">
              <s-text-field
                label="Minimum Products"
                type="number"
                value={formData.minProducts}
                onInput={(e) =>
                  setFormData({ ...formData, minProducts: e.target.value })
                }
                min="2"
              />

              <s-text-field
                label="Maximum Products"
                type="number"
                value={formData.maxProducts}
                onInput={(e) =>
                  setFormData({ ...formData, maxProducts: e.target.value })
                }
                min="2"
              />
            </s-stack>

            <s-select
              label="Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </s-select>

            <s-button type="submit" variant="primary">
              Update Bundle
            </s-button>
          </s-stack>
        </form>
      </s-section>

      <s-section heading="Bundle Products">
        <s-stack direction="block" gap="base">
          <s-button onClick={() => setShowProductPicker(!showProductPicker)}>
            {showProductPicker ? "Hide Products" : "Add Products"}
          </s-button>

          {showProductPicker && (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Select Products to Add</s-heading>
                {shopifyProducts.map((product) => {
                  const isAdded = bundle.products.some(
                    (p) => p.productId === product.id,
                  );
                  return (
                    <s-stack
                      key={product.id}
                      direction="inline"
                      gap="base"
                      alignment="space-between"
                    >
                      <s-text>{product.title}</s-text>
                      {isAdded ? (
                        <s-badge tone="success">Added</s-badge>
                      ) : (
                        <s-button
                          variant="tertiary"
                          onClick={() => handleAddProduct(product)}
                        >
                          Add
                        </s-button>
                      )}
                    </s-stack>
                  );
                })}
              </s-stack>
            </s-box>
          )}

          {bundle.products.length > 0 ? (
            <s-stack direction="block" gap="base">
              {bundle.products.map((product) => (
                <s-box
                  key={product.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignment="space-between"
                  >
                    <s-stack direction="block" gap="tight">
                      <s-heading>{product.productTitle}</s-heading>
                      <s-text>Price: ${product.price}</s-text>
                    </s-stack>
                    <s-button
                      variant="tertiary"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      Remove
                    </s-button>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          ) : (
            <s-paragraph>
              No products added yet. Click "Add Products" to get started.
            </s-paragraph>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
