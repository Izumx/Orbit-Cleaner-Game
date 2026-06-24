export type Category = 'satellite' | 'rocket' | 'debris';

export interface DebrisObject {
  id: string;        // NORAD catalog id
  name: string;
  line1: string;
  line2: string;
  category: Category;
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
