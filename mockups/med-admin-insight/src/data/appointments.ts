
export type Appointment = {
  id: string;
  patientName: string;
  doctor: {
    name: string;
    avatar: string;
  };
  time: string;
  disease: string;
};

export const appointmentsData: Appointment[] = [
  {
    id: "#00001",
    patientName: "Andrea Lalema",
    doctor: {
      name: "Dr. Jeremy Smith",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    },
    time: "7:00 PM",
    disease: "Fracture",
  },
  {
    id: "#00002",
    patientName: "Cristina Groves",
    doctor: {
      name: "Dr. Angelina Romes",
      avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    },
    time: "7:15 PM",
    disease: "Fever",
  },
  {
    id: "#00003",
    patientName: "Bernardo",
    doctor: {
      name: "Dr. Martin Doe",
      avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    },
    time: "7:30 PM",
    disease: "Fracture",
  },
  {
    id: "#00004",
    patientName: "David Lalema",
    doctor: {
      name: "Dr. William Jerk",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    },
    time: "7:50 PM",
    disease: "Fracture",
  },
  {
    id: "#00005",
    patientName: "Cristina Groves",
    doctor: {
      name: "Dr. Angelina Romes",
      avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    },
    time: "7:55 PM",
    disease: "Fever",
  },
];
