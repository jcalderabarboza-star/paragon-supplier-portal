export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  rating: number;
  onboardedDate: string;
}
