import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Transaction exceeds the total cash value.', 400);
    }

    let transactionCategoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!transactionCategoryExists) {
      transactionCategoryExists = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(transactionCategoryExists);
    }

    const transiction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: transactionCategoryExists.id,
    });

    await transactionsRepository.save(transiction);

    return transiction;
  }
}

export default CreateTransactionService;
