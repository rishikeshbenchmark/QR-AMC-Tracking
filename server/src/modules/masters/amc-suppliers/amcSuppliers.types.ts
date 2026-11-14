/**
 * The AMC-supplier shape returned to the client. These are the third parties who fulfil
 * Back-to-Back AMC support and may differ from the seller — hence a separate master from suppliers.
 * No email column on this one.
 */
export interface AmcSupplierDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
}
