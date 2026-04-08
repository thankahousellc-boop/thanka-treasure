import { relations } from "drizzle-orm";

import {
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
} from "./blog";
import {
  addresses,
  customers,
  orderEvents,
  orderItems,
  orders,
} from "./orders";
import { profiles } from "./profiles";
import {
  collectionProducts,
  collections,
  inventory,
  productImages,
  products,
  productVariants,
} from "./products";

export const profilesRelations = relations(profiles, ({ many }) => ({
  customers: many(customers),
  blogPosts: many(blogPosts),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  images: many(productImages),
  collectionLinks: many(collectionProducts),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    images: many(productImages),
    inventory: many(inventory),
    orderItems: many(orderItems),
  }),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  productLinks: many(collectionProducts),
}));

export const collectionProductsRelations = relations(
  collectionProducts,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionProducts.collectionId],
      references: [collections.id],
    }),
    product: one(products, {
      fields: [collectionProducts.productId],
      references: [products.id],
    }),
  }),
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [customers.profileId],
    references: [profiles.id],
  }),
  addresses: many(addresses),
  orders: many(orders),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, {
    fields: [addresses.customerId],
    references: [customers.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(profiles, {
    fields: [blogPosts.authorId],
    references: [profiles.id],
  }),
  categoryLinks: many(blogPostCategories),
  tagLinks: many(blogPostTags),
}));

export const blogCategoriesRelations = relations(
  blogCategories,
  ({ many }) => ({
    postLinks: many(blogPostCategories),
  }),
);

export const blogTagsRelations = relations(blogTags, ({ many }) => ({
  postLinks: many(blogPostTags),
}));

export const blogPostCategoriesRelations = relations(
  blogPostCategories,
  ({ one }) => ({
    post: one(blogPosts, {
      fields: [blogPostCategories.postId],
      references: [blogPosts.id],
    }),
    category: one(blogCategories, {
      fields: [blogPostCategories.categoryId],
      references: [blogCategories.id],
    }),
  }),
);

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostTags.postId],
    references: [blogPosts.id],
  }),
  tag: one(blogTags, {
    fields: [blogPostTags.tagId],
    references: [blogTags.id],
  }),
}));
