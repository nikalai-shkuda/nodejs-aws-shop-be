export type Product = {
  id: string;
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
