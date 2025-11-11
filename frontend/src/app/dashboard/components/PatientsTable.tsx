const patients = [
    { name: "Lautaro Caballero", intervention: "Consulta", date: "18/03/2025", age: 18, weight: 55 },
    { name: "Eduardo Díaz", intervention: "Control", date: "18/03/2025", age: 29, weight: 74 },
    { name: "Sol Gutierrez", intervention: "Ácido H.", date: "18/03/2025", age: 25, weight: 60 },
  ];
  
  export default function PatientsTable() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Pacientes recientes</h3>
          <button className="text-sm text-indigo-500 hover:underline">+ Nuevo paciente</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Última intervención</th>
              <th className="text-left py-2">Fecha</th>
              <th className="text-left py-2">Edad</th>
              <th className="text-left py-2">Peso</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.intervention}</td>
                <td className="py-2">{p.date}</td>
                <td className="py-2">{p.age}</td>
                <td className="py-2">{p.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  