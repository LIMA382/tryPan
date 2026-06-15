export const seedMeals = [
  {
    title: 'Chicken rice bowl', description: 'Easy balanced bowl for weeknights.', meal_type: 'both', prep_time: 25, servings: 2, tags: ['Healthy', 'High protein'], is_public: false,
    ingredients: [
      ['Chicken breast', 600, 'g', 'Protein'], ['Rice', 300, 'g', 'Pantry'], ['Broccoli', 2, 'heads', 'Produce'], ['Soy sauce', 2, 'tbsp', 'Pantry']
    ]
  },
  {
    title: 'Chickpea curry', description: 'Warm pantry meal with coconut and spinach.', meal_type: 'dinner', prep_time: 30, servings: 3, tags: ['Vegetarian', 'Budget'], is_public: true,
    ingredients: [
      ['Chickpeas', 2, 'cans', 'Pantry'], ['Coconut milk', 1, 'can', 'Pantry'], ['Spinach', 200, 'g', 'Produce'], ['Rice', 250, 'g', 'Pantry']
    ]
  },
  {
    title: 'Turkey wraps', description: 'Fast lunch with crunchy salad.', meal_type: 'lunch', prep_time: 15, servings: 2, tags: ['Quick', 'Lunch'], is_public: false,
    ingredients: [
      ['Turkey slices', 250, 'g', 'Protein'], ['Wraps', 4, 'units', 'Pantry'], ['Lettuce', 1, 'head', 'Produce'], ['Greek yogurt', 150, 'g', 'Dairy']
    ]
  }
];

export const publicMeals = [
  { title: 'Salmon pasta', description: 'Creamy lemon salmon pasta.', meal_type: 'dinner', prep_time: 25, servings: 2, tags: ['Dinner', 'Protein'], creator: 'Marta', is_public: true, ingredients: [['Salmon', 300, 'g', 'Protein'], ['Pasta', 250, 'g', 'Pantry'], ['Lemon', 1, 'unit', 'Produce'], ['Cream', 150, 'ml', 'Dairy']] },
  { title: 'Greek salad bowl', description: 'Fresh lunch bowl with feta.', meal_type: 'lunch', prep_time: 12, servings: 2, tags: ['Fresh', 'Vegetarian'], creator: 'Tomás', is_public: true, ingredients: [['Cucumber', 1, 'unit', 'Produce'], ['Tomatoes', 4, 'units', 'Produce'], ['Feta', 150, 'g', 'Dairy'], ['Chickpeas', 1, 'can', 'Pantry']] },
  { title: 'Tomato basil soup', description: 'Simple comfort soup.', meal_type: 'dinner', prep_time: 35, servings: 4, tags: ['Budget', 'Comfort'], creator: 'Ana', is_public: true, ingredients: [['Tomatoes', 8, 'units', 'Produce'], ['Onion', 1, 'unit', 'Produce'], ['Basil', 1, 'bunch', 'Produce'], ['Bread', 1, 'loaf', 'Bakery']] }
];
