import * as satellite from 'satellite.js';
import type { DebrisObject, Question } from '../data/types';
import { altitudeKm } from '../orbits/propagate';

function currentAltitude(obj: DebrisObject, now: Date): number {
  try {
    const satrec = satellite.twoline2satrec(obj.line1, obj.line2);
    const pv = satellite.propagate(satrec, now);
    if (pv && typeof pv.position !== 'boolean') return Math.round(altitudeKm(pv.position));
  } catch { /* ignore */ }
  return 0;
}

export function generateQuestion(obj: DebrisObject, now: Date = new Date()): Question {
  const alt = currentAltitude(obj, now);

  if (alt < 600) {
    return {
      text: `«${obj.name}» сейчас на высоте ~${alt} км (низкая орбита, LEO). Как быстро такой объект сам сойдёт с орбиты из-за остаточной атмосферы?`,
      options: ['За годы — десятилетия', 'За тысячи лет', 'Никогда'],
      correctIndex: 0,
      explanation: 'Ниже ~600 км атмосфера ещё ощутимо тормозит объекты, поэтому они сходят за годы–десятки лет. Именно поэтому МКС (~400 км) приходится регулярно поднимать.',
    };
  }
  if (alt < 2000) {
    return {
      text: `«${obj.name}» на высоте ~${alt} км. На этой высоте сопротивление атмосферы почти нулевое. Сколько обломок проведёт здесь, прежде чем упадёт?`,
      options: ['Несколько недель', 'Сотни лет и более', 'Пару лет'],
      correctIndex: 1,
      explanation: 'На высотах ~800–2000 км объекты остаются на орбите сотни и тысячи лет — это самая «грязная» зона и главный очаг риска синдрома Кесслера.',
    };
  }
  return {
    text: `«${obj.name}» на высоте ~${alt} км — это уже область высоких орбит. Чем опасно столкновение на орбитальных скоростях (~7–8 км/с)?`,
    options: [
      'Один обломок порождает тысячи новых',
      'Ничем, объекты просто отскакивают',
      'Они слипаются в один',
    ],
    correctIndex: 0,
    explanation: 'На орбитальных скоростях даже сантиметровый осколок несёт энергию гранаты. Столкновение дробит объекты на тысячи фрагментов — это и есть механизм каскада Кесслера.',
  };
}
