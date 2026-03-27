import { IngredientForm } from "./IngredientForm"
 
export const metadata = { title: "Nuevo ingrediente personal" }
 
export default function NewPersonalIngredientPage() {
  return <IngredientForm mode="personal" redirectTo="/ingredients" />
}
