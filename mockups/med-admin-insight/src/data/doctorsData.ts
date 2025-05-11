export type Doctor = {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  status: "Available" | "Unavailable";
  room: string; // e.g. Room A-101
  phone: string; // e.g. (123) 456-7890
};

export const doctorsData: Doctor[] = [
  {
    id: "D001",
    name: "Dr. Emily Carter",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    specialty: "Cardiology",
    status: "Available",
    room: "C-203",
    phone: "(555) 123-4567",
  },
  {
    id: "D002",
    name: "Dr. James Wilson",
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    specialty: "Neurology",
    status: "Unavailable",
    room: "N-105",
    phone: "(555) 987-6543",
  },
  {
    id: "D003",
    name: "Dr. Sarah Chen",
    avatar:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    specialty: "Pediatrics",
    status: "Available",
    room: "P-301",
    phone: "(555) 345-6789",
  },
  {
    id: "D004",
    name: "Dr. Michael Brown",
    avatar:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    specialty: "Oncology",
    status: "Available",
    room: "O-112",
    phone: "(555) 678-1234",
  },
  {
    id: "D005",
    name: "Dr. Linda Davis",
    avatar:
      "https://images.unsplash.com/photo-1605108040941-7c762d5ed4e4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    specialty: "General Practice",
    status: "Unavailable",
    room: "G-101",
    phone: "(555) 234-5678",
  },
];
