// src/services/invoiceService.ts
import db from '../db';
import { Invoice } from '../types/invoice';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';

interface InvoiceRow {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: string;
}

class InvoiceService {
  static async list( userId: string, status?: string, operator?: string): Promise<Invoice[]> {
    const validOperators = ['=', '!=', '<', '>', '<=', '>='];
    let q = db<InvoiceRow>('invoices').where({ userId: userId });

    if (status && operator) {
      if (!validOperators.includes(operator)) {
        throw new Error("Invalid operator");
      }
      q = q.andWhere('status', operator, status);
    } else if (status) {
      q = q.andWhere('status', '=', status);
    }

    const rows = await q.select();
    const invoices = rows.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      dueDate: row.dueDate,
      status: row.status} as Invoice
    ));
    return invoices;
  }

  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {
    // use axios to call http://paymentBrand/payments as a POST request
    // with the body containing ccNumber, ccv, expirationDate
    // and handle the response accordingly
    // const paymentResponse = await axios.post(`http://${paymentBrand}/payments`, {
    //   ccNumber,
    //   ccv,
    //   expirationDate
    // });

    const paymentUrls: Record<string,string> = {
      visa: 'https://visa-payments.local/payments',
      mastercard: 'https://mastercard-payments.local/payments',
      amex: 'https://amex-payments.local/payments'
    };
  
    const url = paymentUrls[paymentBrand];
    if (!url) throw new Error('Payment brand not supported');
  
    const paymentResponse = await axios.post(url, {
      ccNumber,
      ccv,
      expirationDate
    });

    if (paymentResponse.status !== 200) {
      throw new Error('Payment failed');
    }

    // Update the invoice status in the database
    await db('invoices')
      .where({ id: invoiceId, userId })
      .update({ status: 'paid' });  
    };
  static async  getInvoice( invoiceId:string): Promise<Invoice> {
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice as Invoice;
  }


  static async getReceipt(invoiceId: string, pdfName: string) {
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    try {
      if (pdfName.includes('..') || pdfName.includes('/') || !pdfName.includes('.pdf')) {
        throw new Error('Invalid file name');
      }
      const filePath = `/invoices/${pdfName}`;
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading receipt file:', error);
      throw new Error('Receipt not found');
    } 
  };
};

export default InvoiceService;
