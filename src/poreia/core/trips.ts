export type TripStatus = 'idea' | 'planning' | 'tentative' | 'booked' | 'in-progress' | 'completed' | 'canceled';

export type Trip = {
  id: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status: TripStatus;
  travelers: string[];
  createdAt: string;
  updatedAt: string;
};

export type PlaceIdea = {
  id: string;
  name: string;
  location?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};
