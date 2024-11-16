import { RequestHandler } from 'express';
import db from '../config/db';

// Fetch all available grocery items
const getAvailableGroceries: RequestHandler = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM groceries WHERE stock > 0');
    res.status(200).json(rows);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Book multiple grocery items
const bookGroceries: RequestHandler = async (req, res) => {
  const { items } = req.body; // items = [{ id: 1, quantity: 2 }, { id: 2, quantity: 3 }]
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      const [result] = await connection.query('SELECT stock FROM groceries WHERE id = ?', [item.id]);
      const grocery = (result as any)[0];

      if (!grocery || grocery.stock < item.quantity) {
        throw new Error(`Insufficient stock for item ID: ${item.id}`);
      }

      await connection.query(
        'UPDATE groceries SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Groceries booked successfully' });
  } catch (error) {
    await connection.rollback();
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  } finally {
    connection.release();
  }
};

// Export all handlers as default
export default {
  getAvailableGroceries,
  bookGroceries,
};
