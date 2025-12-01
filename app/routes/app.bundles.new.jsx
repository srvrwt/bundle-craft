import { useState } from "react";
import { useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const bundle = await prisma.bundle.create({
    data: {
      shop: session.shop,
      title: formData.get("title"),
      description: formData.get("description") || "",
      discountType: formData.get("discountType"),
      discountValue: parseFloat(formData.get("discountValue") || 0),
      minProducts: parseInt(formData.get("minProducts") || 2),
      maxProducts: parseInt(formData.get("maxProducts") || 5),
      status: "draft",
    },
  });

  return { bundle };
};

export default function NewBundle() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: "10",
    minProducts: "2",
    maxProducts: "5",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    const response = await fetch("/app/bundles/new", {
      method: "POST",
      body: data,
    });

    if (response.ok) {
      navigate("/app");
    }
  };

  return (
    <s-page
      heading="Create Bundle"
      backAction={{ onClick: () => navigate("/app") }}
    >
      <s-section>
        <form onSubmit={handleSubmit}>
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

            <s-stack direction="inline" gap="base">
              <s-button type="submit" variant="primary">
                Create Bundle
              </s-button>
              <s-button onClick={() => navigate("/app")}>Cancel</s-button>
            </s-stack>
          </s-stack>
        </form>
      </s-section>
    </s-page>
  );
}
