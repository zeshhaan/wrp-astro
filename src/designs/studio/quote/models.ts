/**
 * Common cars in the UAE for the make & model typeahead (local, no network).
 * The body type is a suggestion only: it pre-selects a shape card when the
 * customer hasn't chosen one. Mix from WRP's reviews and portfolio plus the
 * UAE's best sellers.
 */
import type { BodyType } from './panels';

const list: [string, BodyType][] = [
  ['Toyota Land Cruiser', 'suv'], ['Toyota Land Cruiser Prado', 'suv'], ['Toyota Camry', 'sedan'], ['Toyota Corolla', 'sedan'],
  ['Toyota Yaris', 'sedan'], ['Toyota RAV4', 'suv'], ['Toyota Fortuner', 'suv'], ['Toyota FJ Cruiser', 'suv'], ['Toyota Hilux', 'pickup'],
  ['Toyota Tundra', 'pickup'], ['Toyota Supra', 'coupe'], ['Toyota GR86', 'coupe'], ['Lexus LX', 'suv'], ['Lexus GX', 'suv'],
  ['Lexus RX', 'suv'], ['Lexus ES', 'sedan'], ['Lexus IS', 'sedan'], ['Lexus LS', 'sedan'], ['Nissan Patrol', 'suv'],
  ['Nissan Patrol Nismo', 'suv'], ['Nissan Altima', 'sedan'], ['Nissan Sunny', 'sedan'], ['Nissan X-Trail', 'suv'], ['Nissan Kicks', 'suv'],
  ['Nissan Navara', 'pickup'], ['Nissan GT-R', 'coupe'], ['Nissan Z', 'coupe'], ['Infiniti QX80', 'pickup'], ['Mitsubishi Pajero', 'suv'],
  ['Mitsubishi L200', 'pickup'], ['Hyundai Elantra', 'sedan'], ['Hyundai Sonata', 'sedan'], ['Hyundai Tucson', 'suv'],
  ['Hyundai Santa Fe', 'suv'], ['Hyundai Palisade', 'suv'], ['Kia K5', 'sedan'], ['Kia Sportage', 'suv'], ['Kia Sorento', 'suv'],
  ['Kia Telluride', 'suv'], ['Honda Accord', 'sedan'], ['Honda Civic', 'sedan'], ['Honda CR-V', 'suv'], ['Mazda CX-5', 'suv'],
  ['Mazda 6', 'sedan'], ['Subaru WRX STI', 'sedan'], ['Volkswagen Golf GTI', 'sedan'], ['Volkswagen Touareg', 'suv'],
  ['Mercedes-Benz C-Class', 'sedan'], ['Mercedes-Benz E-Class', 'sedan'], ['Mercedes-Benz S-Class', 'sedan'], ['Mercedes-AMG E 63', 'sedan'],
  ['Mercedes-Benz CLA', 'sedan'], ['Mercedes-Benz GLC', 'suv'], ['Mercedes-Benz GLE', 'suv'], ['Mercedes-Benz GLS', 'pickup'],
  ['Mercedes-Benz G-Class', 'pickup'], ['Mercedes-AMG GT', 'coupe'], ['Mercedes-Maybach S-Class', 'sedan'], ['BMW 3 Series', 'sedan'],
  ['BMW 5 Series', 'sedan'], ['BMW 7 Series', 'sedan'], ['BMW M3', 'sedan'], ['BMW M4', 'coupe'], ['BMW M5', 'sedan'],
  ['BMW X3', 'suv'], ['BMW X5', 'suv'], ['BMW X6', 'suv'], ['BMW X7', 'pickup'], ['BMW XM', 'suv'], ['BMW Z4', 'coupe'],
  ['Audi A4', 'sedan'], ['Audi A6', 'sedan'], ['Audi A8', 'sedan'], ['Audi RS 6', 'sedan'], ['Audi R8', 'coupe'], ['Audi Q5', 'suv'],
  ['Audi Q7', 'suv'], ['Audi Q8', 'suv'], ['Audi RS Q8', 'suv'], ['Range Rover', 'pickup'], ['Range Rover Sport', 'suv'],
  ['Range Rover Velar', 'suv'], ['Range Rover Evoque', 'suv'], ['Land Rover Defender', 'suv'], ['Porsche 911', 'coupe'],
  ['Porsche 718 Boxster', 'coupe'], ['Porsche 718 Cayman', 'coupe'], ['Porsche Taycan', 'sedan'], ['Porsche Panamera', 'sedan'],
  ['Porsche Macan', 'suv'], ['Porsche Cayenne', 'suv'], ['Tesla Model 3', 'sedan'], ['Tesla Model Y', 'suv'], ['Tesla Model S', 'sedan'],
  ['Tesla Model X', 'suv'], ['Tesla Cybertruck', 'pickup'], ['Chevrolet Tahoe', 'pickup'], ['Chevrolet Suburban', 'pickup'],
  ['Chevrolet Silverado', 'pickup'], ['Chevrolet Camaro', 'coupe'], ['Chevrolet Corvette', 'coupe'], ['GMC Yukon', 'pickup'],
  ['GMC Sierra', 'pickup'], ['Cadillac Escalade', 'pickup'], ['Ford Mustang', 'coupe'], ['Ford F-150', 'pickup'],
  ['Ford F-150 Raptor', 'pickup'], ['Ford Ranger', 'pickup'], ['Ford Explorer', 'suv'], ['Ford Expedition', 'pickup'],
  ['Ford Bronco', 'suv'], ['Dodge Charger', 'sedan'], ['Dodge Challenger', 'coupe'], ['Dodge Durango', 'suv'], ['Ram 1500', 'pickup'],
  ['Ram TRX', 'pickup'], ['Jeep Wrangler', 'suv'], ['Jeep Grand Cherokee', 'suv'], ['Jeep Gladiator', 'pickup'],
  ['Rolls-Royce Cullinan', 'pickup'], ['Rolls-Royce Ghost', 'sedan'], ['Rolls-Royce Phantom', 'sedan'], ['Rolls-Royce Spectre', 'coupe'],
  ['Bentley Bentayga', 'suv'], ['Bentley Continental GT', 'coupe'], ['Bentley Flying Spur', 'sedan'], ['Lamborghini Urus', 'suv'],
  ['Lamborghini Huracán', 'coupe'], ['Lamborghini Revuelto', 'coupe'], ['Ferrari 296', 'coupe'], ['Ferrari Roma', 'coupe'],
  ['Ferrari Purosangue', 'suv'], ['McLaren 750S', 'coupe'], ['Aston Martin DBX', 'suv'], ['Aston Martin Vantage', 'coupe'],
  ['Maserati Levante', 'suv'], ['Maserati MC20', 'coupe'], ['Lotus Emira', 'coupe'], ['Lotus Exige', 'coupe'], ['Hongqi H9', 'sedan'],
  ['Hongqi HS5', 'suv'], ['Jetour T2', 'suv'], ['Jetour X70', 'suv'], ['Jetour Dashing', 'suv'], ['Geely Coolray', 'suv'],
  ['Geely Monjaro', 'suv'], ['Changan UNI-K', 'suv'], ['MG ZS', 'suv'], ['MG 5', 'sedan'], ['Chery Tiggo 8', 'suv'],
  ['Haval H6', 'suv'], ['BYD Seal', 'sedan'], ['BYD Atto 3', 'suv'], ['Zeekr 001', 'sedan'], ['Lucid Air', 'sedan'],
  ['Suzuki Jimny', 'suv'], ['Suzuki Swift', 'sedan'], ['Genesis G80', 'sedan'], ['Genesis GV80', 'suv'], ['Volvo XC90', 'suv'],
];

export const carModels = list.map(([name, body]) => ({ name, body }));

export function bodyForModel(text: string): BodyType | null {
  const t = text.trim().toLowerCase();
  if (t.length < 3) return null;
  const exact = carModels.find((m) => m.name.toLowerCase() === t);
  if (exact) return exact.body;
  // "land cruiser 2022", "patrol" etc: longest model name contained in the text.
  const hits = carModels.filter((m) => {
    const model = m.name.toLowerCase().split(' ').slice(1).join(' ');
    return model.length >= 3 && t.includes(model);
  });
  hits.sort((a, b) => b.name.length - a.name.length);
  return hits[0]?.body ?? null;
}
