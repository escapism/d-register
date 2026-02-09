import Dexie, { type Table } from 'dexie';
import {type TaxonomyName } from "@/const/taxonomy"

export interface Product {
  id?: number;
  title: string;
  price: number;
  stock: number;
  infinite_stock: 0 | 1;
  pubdate: string;
  cost: number | null;
  total_sales_amount: number;
  image?: Blob | string;
  sortOrder: number;
  hidden: 0 | 1;
  r18: 0 | 1;
  terms: Record<string, number[]>;
}

export interface Term {
  id?: number;
  name: string;
  taxonomy: TaxonomyName;
  sortOrder: number;
}

export interface AppOption {
  key: string;
  value: any;
}

export interface Sale {
  id?: number;
  transactionId: string;
  productId: number;
  timestamp: Date;
  productTitle: string;
  quantity: number;
  priceAtSale: number;
}

export class MyDatabase extends Dexie {
  products!: Table<Product>;
  terms!: Table<Term>;
  options!: Table<AppOption>;
  sales!: Table<Sale>;

  constructor() {
    super('DRegi');
    this.version(2).stores({
      products: '++id, title, sortOrder, hidden, *terms.category',
      terms: '++id, taxonomy, sortOrder',
      options: 'key',
      sales: '++id, productId, transactionId, timestamp'
    });
  }
}

export const db = new MyDatabase();