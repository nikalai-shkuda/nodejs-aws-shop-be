export type Product = {
  id: string;
  imageUrl?: string;
  description: string;
  price: number;
  title: string;
};

export type Stock = {
  product_id: string;
  count: number;
};

export type ProductRequest = Product & {
  count: number;
};
