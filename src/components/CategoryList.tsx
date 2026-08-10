import React from 'react';
import { Category } from '../types';
import { UtensilsCrossed, ShoppingCart, Pill, Apple, Cake, Bike, LayoutGrid } from 'lucide-react';

interface Props {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="w-4 h-4" />,
  UtensilsCrossed: <UtensilsCrossed className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  Pill: <Pill className="w-4 h-4" />,
  Apple: <Apple className="w-4 h-4" />,
  Cake: <Cake className="w-4 h-4" />,
  Bike: <Bike className="w-4 h-4" />
};

export const CategoryList: React.FC<Props> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="py-2 overflow-x-auto scrollbar-none flex gap-2.5 pb-2">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs active:scale-95 shrink-0 ${
              isSelected
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-2'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <span className={`p-1.5 rounded-xl ${isSelected ? 'bg-white/20 text-white' : cat.color}`}>
              {iconMap[cat.icon] || <LayoutGrid className="w-4 h-4" />}
            </span>
            <span>{cat.name}</span>
            {cat.badge && (
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {cat.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
