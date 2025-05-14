export type Patient = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  dob: string;
  diagnosis: string;
  triage: "Non-Urgent" | "Out Patient" | "Emergency";
};

export const patientsData: Patient[] = [
  {
    id: "#00001",
    name: "Andrea Lalema",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    age: 21,
    dob: "07 January 2002",
    diagnosis: "Heart attack",
    triage: "Non-Urgent",
  },
  {
    id: "#00002",
    name: "Mark Hey Smith",
    avatar:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    age: 23,
    dob: "04 January 2000",
    diagnosis: "Jaundice",
    triage: "Non-Urgent",
  },
  {
    id: "#00003",
    name: "Cristina Groves",
    avatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    age: 25,
    dob: "10 January 1998",
    diagnosis: "Malaria",
    triage: "Out Patient",
  },
  {
    id: "#00004",
    name: "Galina Lalema",
    avatar:
      "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    age: 21,
    dob: "09 January 2002",
    diagnosis: "Typhoid",
    triage: "Emergency",
  },
  {
    id: "#00005",
    name: "Jonathan Doe",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    age: 30,
    dob: "15 January 1985",
    diagnosis: "Check-up",
    triage: "Non-Urgent",
  },
];
