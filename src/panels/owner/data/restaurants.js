// Static restaurant profiles for the demo owners. In production: GET /restaurants/:id
// (profile, outlets, menu) once the owner signs in.

const T = (section, prefix, count, seats) => ({ section, prefix, count, seats })

export const RESTAURANTS = {
  'RST-0398': {
    id: 'RST-0398',
    name: 'Hotel Annapurna',
    owner: 'Gururaj Kulkarni',
    type: 'FRANCHISE',
    plan: 'enterprise',
    cuisine: 'South Indian vegetarian',
    gstin: '29AAFCH4512L1Z7',
    fssai: '11224999000881',
    phone: '+91 836 236 4455',
    email: 'accounts@annapurna.in',
    renewsOn: 12, // days from today
    online: true,
    outlets: [
      { id: 'OUT-1', code: 'GKR', name: 'Gokul Road', city: 'Hubballi', address: 'Gokul Road, near Airport Cross, Hubballi 580030', opens: '07:00', closes: '22:30', status: 'ACTIVE', volume: 1, tables: [T('AC hall', 'A', 8, 4), T('Family hall', 'F', 6, 6)] },
      { id: 'OUT-2', code: 'VDN', name: 'Vidyanagar', city: 'Hubballi', address: 'PB Road, Vidyanagar, Hubballi 580031', opens: '07:00', closes: '22:30', status: 'ACTIVE', volume: 0.85, tables: [T('Main hall', 'M', 10, 4), T('Terrace', 'T', 4, 4)] },
      {
        id: 'OUT-3', code: 'OHB', name: 'Old Hubli', city: 'Hubballi', address: 'Station Road, Old Hubli 580024', opens: '07:00', closes: '22:00', status: 'SUSPENDED', volume: 0.55,
        suspendedNote: 'Suspended by Dime Quest: the FSSAI licence for this outlet has expired. Upload the renewed licence in Settings › Outlets to reactivate.',
        tables: [T('Hall', 'H', 8, 4)],
      },
      { id: 'OUT-4', code: 'JBC', name: 'Jubilee Circle', city: 'Dharwad', address: 'Jubilee Circle, Dharwad 580001', opens: '07:00', closes: '22:30', status: 'ACTIVE', volume: 0.7, tables: [T('AC hall', 'A', 6, 4), T('Non-AC hall', 'N', 6, 4)] },
      { id: 'OUT-5', code: 'HSR', name: 'Hosur', city: 'Hubballi', address: 'Hosur Cross, Hubballi 580021', opens: '07:00', closes: '22:00', status: 'ACTIVE', volume: 0.6, tables: [T('Hall', 'H', 8, 4)] },
    ],
    categories: [
      { id: 'c-bf', name: 'Breakfast', from: '07:00', to: '11:30' },
      { id: 'c-ml', name: 'Meals', from: '12:00', to: '15:30' },
      { id: 'c-ch', name: 'Chats', from: '16:00', to: '21:30' },
      { id: 'c-cn', name: 'Chinese', from: '12:00', to: '22:00' },
      { id: 'c-bv', name: 'Beverages', from: '07:00', to: '22:00' },
      { id: 'c-ds', name: 'Desserts', from: '11:00', to: '22:00' },
    ],
    items: [
      ['Idli vada', 'c-bf', 60, 8, true], ['Masala dosa', 'c-bf', 80, 10, true], ['Davangere benne dosa', 'c-bf', 95, 12], ['Set dosa', 'c-bf', 75, 10],
      ['Upma', 'c-bf', 50, 5], ['Kesari bath', 'c-bf', 45, 5], ['Poori sagu', 'c-bf', 70, 8], ['Khara bath and kesari bath', 'c-bf', 85, 6],
      ['South Indian thali', 'c-ml', 140, 6, true], ['North Indian thali', 'c-ml', 170, 8], ['Jolada rotti oota', 'c-ml', 150, 8, true], ['Bisi bele bath', 'c-ml', 80, 4], ['Curd rice', 'c-ml', 70, 3],
      ['Girmit', 'c-ch', 50, 5, true], ['Mirchi bajji', 'c-ch', 40, 6], ['Pani puri', 'c-ch', 40, 4], ['Masala puri', 'c-ch', 50, 5],
      ['Gobi manchurian', 'c-cn', 120, 12], ['Veg fried rice', 'c-cn', 130, 10], ['Veg hakka noodles', 'c-cn', 130, 10],
      ['Filter coffee', 'c-bv', 30, 3, true], ['Tea', 'c-bv', 20, 3], ['Badam milk', 'c-bv', 50, 2], ['Fresh lime soda', 'c-bv', 50, 3], ['Sweet lassi', 'c-bv', 60, 3],
      ['Dharwad pedha (2 pcs)', 'c-ds', 40, 1, true], ['Gulab jamun', 'c-ds', 50, 1], ['Gadbad ice cream', 'c-ds', 110, 4],
    ],
    inventory: [
      // name, unit, cost per unit, reorder level, daily use per outlet
      ['Rice', 'kg', 52, 50, 28], ['Urad dal', 'kg', 128, 15, 6], ['Toor dal', 'kg', 142, 12, 5], ['Bombay rava', 'kg', 46, 15, 5],
      ['Jowar flour', 'kg', 48, 15, 6], ['Milk', 'L', 54, 40, 35], ['Curd', 'L', 62, 20, 12], ['Ghee', 'kg', 640, 5, 1.5],
      ['Sunflower oil', 'L', 148, 30, 12], ['Onion', 'kg', 34, 25, 14], ['Potato', 'kg', 30, 25, 12], ['Tomato', 'kg', 28, 15, 9],
      ['Green chilli', 'kg', 60, 5, 2.5], ['Coconut', 'pcs', 32, 40, 30], ['Coffee powder', 'kg', 720, 4, 1.2], ['Tea powder', 'kg', 480, 3, 0.8],
      ['Sugar', 'kg', 44, 25, 8], ['Paneer', 'kg', 360, 5, 2], ['Commercial LPG (19 kg)', 'cyl', 1765, 4, 1.2], ['Parcel containers', 'pcs', 6, 400, 160],
    ],
    managers: ['Raghu N', 'Shilpa K', 'Mahesh P', 'Prashant B', 'Kavya R'],
  },

  'RST-0377': {
    id: 'RST-0377',
    name: 'Basavaraj Khanavali',
    owner: 'Basavaraj Angadi',
    type: 'SINGLE',
    plan: 'starter',
    cuisine: 'North Karnataka meals',
    gstin: '29BQKPA7321M1Z4',
    fssai: '21224999000312',
    phone: '+91 836 244 1180',
    email: 'basavaraj@khanavali.in',
    renewsOn: 4,
    online: false,
    outlets: [
      { id: 'OUT-B1', code: 'BKV', name: 'Saptapur', city: 'Dharwad', address: 'Saptapur Bhavi Road, Dharwad 580001', opens: '11:00', closes: '22:00', status: 'ACTIVE', volume: 0.45, tables: [T('Hall', 'T', 10, 4)] },
    ],
    categories: [
      { id: 'k-ml', name: 'Oota (meals)', from: '11:30', to: '22:00' },
      { id: 'k-sd', name: 'Sides', from: '11:30', to: '22:00' },
      { id: 'k-sn', name: 'Snacks', from: '16:00', to: '21:00' },
      { id: 'k-bv', name: 'Drinks', from: '11:00', to: '22:00' },
    ],
    items: [
      ['Jolada rotti oota', 'k-ml', 120, 6, true], ['Chapati oota', 'k-ml', 110, 6], ['Rice oota', 'k-ml', 90, 4],
      ['Ennegai palya', 'k-sd', 70, 3, true], ['Kalu palya', 'k-sd', 50, 3], ['Shenga chutney', 'k-sd', 20, 1], ['Jhunka', 'k-sd', 60, 4],
      ['Mirchi bajji', 'k-sn', 30, 6], ['Girmit', 'k-sn', 40, 5],
      ['Majjige (buttermilk)', 'k-bv', 15, 1], ['Tea', 'k-bv', 15, 3],
    ],
    inventory: [
      ['Jowar flour', 'kg', 48, 20, 9], ['Wheat flour', 'kg', 38, 15, 5], ['Rice', 'kg', 52, 25, 10], ['Brinjal', 'kg', 40, 8, 5],
      ['Groundnut', 'kg', 130, 5, 1.5], ['Curd', 'L', 62, 10, 6], ['Sunflower oil', 'L', 148, 10, 4], ['Onion', 'kg', 34, 10, 6],
      ['Green chilli', 'kg', 60, 3, 1.5], ['Commercial LPG (19 kg)', 'cyl', 1765, 2, 0.6],
    ],
    managers: ['Shivu A'],
  },
}
