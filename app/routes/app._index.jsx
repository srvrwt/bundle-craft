import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const bundles = await prisma.bundle.findMany({
    where: { shop: session.shop },
    include: {
      products: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { bundles };
};

export default function Index() {
  const { bundles } = useLoaderData();
  const navigate = useNavigate();

  return (
    <s-page heading="Bundle Builder">
      <s-button
        slot="primary-action"
        onClick={() => navigate("/app/bundles/new")}
      >
        Create Bundle
      </s-button>

      <s-section heading="Your Bundles">
        {bundles.length === 0 ? (
          <s-stack direction="block" gap="large" alignment="center">
            <s-paragraph>
              You haven't created any bundles yet. Create your first bundle to
              get started!
            </s-paragraph>
            <s-button onClick={() => navigate("/app/bundles/new")}>
              Create Your First Bundle
            </s-button>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            {bundles.map((bundle) => (
              <s-box
                key={bundle.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="base">
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignment="space-between"
                  >
                    <s-heading>{bundle.title}</s-heading>
                    <s-badge
                      tone={bundle.status === "active" ? "success" : "info"}
                    >
                      {bundle.status}
                    </s-badge>
                  </s-stack>

                  {bundle.description && (
                    <s-paragraph>{bundle.description}</s-paragraph>
                  )}

                  <s-stack direction="inline" gap="large">
                    <s-text>Products: {bundle.products.length}</s-text>
                    <s-text>
                      Discount:{" "}
                      {bundle.discountType === "percentage"
                        ? `${bundle.discountValue}% off`
                        : bundle.discountType === "fixed"
                          ? `$${bundle.discountValue} off`
                          : "No discount"}
                    </s-text>
                    <s-text>
                      Min: {bundle.minProducts} | Max: {bundle.maxProducts}
                    </s-text>
                  </s-stack>

                  <s-button
                    variant="tertiary"
                    onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                  >
                    Edit Bundle
                  </s-button>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="About Bundle Builder">
        <s-paragraph>
          Create product bundles with custom discounts to increase your average
          order value.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Set percentage or fixed amount discounts</s-list-item>
          <s-list-item>Choose which products to bundle together</s-list-item>
          <s-list-item>
            Control minimum and maximum products per bundle
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
