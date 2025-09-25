"use client";
import { useEffect, useState } from "react";
import { listAddresses, saveAddress, deleteAddress, SavedAddress } from "@/lib/addresses";

export default function AccountAddresses() {
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => { setItems(listAddresses()); }, []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !address) return;
    saveAddress({ label, address });
    setLabel(""); setAddress("");
    setItems(listAddresses());
  }

  function remove(id: string) {
    deleteAddress(id);
    setItems(listAddresses());
  }

  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Saved Addresses</h3>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <input className="border rounded px-2 py-1 flex-1" placeholder="Label (e.g., Home)" value={label} onChange={e=>setLabel(e.target.value)} />
        <input className="border rounded px-2 py-1 flex-[2]" placeholder="Address" value={address} onChange={e=>setAddress(e.target.value)} />
        <button className="border rounded px-3 py-1" type="submit">Save</button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(a => (
            <li key={a.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div>
                <div className="font-medium">{a.label}</div>
                <div className="text-sm text-gray-600">{a.address}</div>
              </div>
              <button className="text-sm underline" onClick={()=>remove(a.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
