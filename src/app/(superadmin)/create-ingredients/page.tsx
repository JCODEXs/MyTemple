import { IngredientForm } from "./IngredientForm"
 
export const metadata = { title: "Nuevo ingrediente global" }
 
export default function NewGlobalIngredientPage() {
  return <IngredientForm mode="global" redirectTo="/superadmin" />
}