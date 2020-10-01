import { getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getRepository(Transaction);
    const categoryRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      if (title && type && value) {
        transactions.push({ title, type, value, category });
        categories.push(category);
      }
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesExists = await categoryRepository.find({
      where: { title: In(categories) },
    });

    const categoriesTitleExists = categoriesExists.map(
      (category: Category) => category.title,
    );

    const createCategoreis = categories
      .filter(category => !categoriesTitleExists.includes(category))
      .filter((title, index, seft) => seft.indexOf(title) === index);

    const newCategoreis = categoryRepository.create(
      createCategoreis.map(title => ({
        title,
      })),
    );

    const categoriesFinal = [...newCategoreis, ...categoriesExists];

    await categoryRepository.save(newCategoreis);

    const newTransaction = transactionRepository.create(
      transactions.map(({ title, type, value, category }) => ({
        title,
        type,
        value,
        category: categoriesFinal.find(i => i.title === category),
      })),
    );

    await transactionRepository.save(newTransaction);
    await fs.promises.unlink(filePath);

    return newTransaction;
  }
}

export default ImportTransactionsService;
