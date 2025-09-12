import { Header, Main, MainHeader } from "@/blocks/dashboard";
import { FormCard } from "@/blocks/form";
import { Form } from "@/types/blocks/form";
import {
  addTaxonomy,
  NewTaxonomy,
  TaxonomyStatus,
  TaxonomyType,
} from "@/services/taxonomy";
import { getUuid } from "@/lib/hash";
import { getUserInfo } from "@/services/user";

export default async function AddCategoryPage() {
  const form: Form = {
    fields: [
      {
        name: "slug",
        type: "text",
        title: "Slug",
        tip: "unique slug for the category",
        validation: { required: true },
      },
      {
        name: "title",
        type: "text",
        title: "Category Name",
        validation: { required: true },
      },
      {
        name: "description",
        type: "textarea",
        title: "Description",
      },
    ],
    passby: {
      type: "category",
    },
    data: {},
    submit: {
      button: {
        text: "Add Category",
      },
      handler: async (data, passby) => {
        "use server";

        const user = await getUserInfo();
        if (!user) {
          throw new Error("no auth");
        }

        const slug = data.get("slug") as string;
        const title = data.get("title") as string;
        const description = data.get("description") as string;

        if (!slug?.trim() || !title?.trim()) {
          throw new Error("slug and title are required");
        }

        const newCategory: NewTaxonomy = {
          id: getUuid(),
          userId: user.id,
          parentId: "", // todo: select parent category
          slug: slug.trim().toLowerCase(),
          type: TaxonomyType.CATEGORY,
          title: title.trim(),
          description: description.trim(),
          image: "",
          icon: "",
          status: TaxonomyStatus.PUBLISHED,
        };

        const result = await addTaxonomy(newCategory);

        if (!result) {
          throw new Error("add category failed");
        }

        return {
          status: "success",
          message: "category added",
          redirect_url: "/admin/categories",
        };
      },
    },
  };

  return (
    <>
      <Header />
      <Main>
        <MainHeader title="Add Category" />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
