export default class RestockRequestDTO {
    // Attributes for the request
    sup_id;
    prep_agent_id;
    auth_agent_id;
    invoice_no;
    bill_no;
    payment_method;
    discount;
    expenses;
    current_amount;
    cash_amount;
    change_amount;
    total_amount;
    exe_level;
    added_items;
    return_items;

    constructor({
        sup_id,
        prep_agent_id,
        auth_agent_id,
        invoice_no,
        bill_no,
        payment_method,
        discount,
        expenses,
        current_amount,
        cash_amount,
        change_amount,
        total_amount,
        exe_level,
        added_items,
        return_items
    }) {
        this.sup_id = sup_id;
        this.prep_agent_id = prep_agent_id;
        this.auth_agent_id = auth_agent_id;
        this.invoice_no = invoice_no;
        this.bill_no = bill_no;
        this.payment_method = payment_method;
        this.discount = discount;
        this.expenses = expenses;
        this.current_amount = current_amount;
        this.cash_amount = cash_amount;
        this.change_amount = change_amount;
        this.total_amount = total_amount;
        this.exe_level = exe_level;
        // this.added_items = added_items;
        // this.return_items = return_items;
        this.added_items = Array.isArray(added_items) ? added_items.map(item => new AddedItemDTO(item)) : [];
        this.return_items = Array.isArray(return_items) ? return_items.map(item => new ReturnItemDTO(item)) : [];
    }

    // Add toJSON method for serialization
    toJSON() {
        return {
            sup_id: this.sup_id,
            prep_agent_id: this.prep_agent_id,
            auth_agent_id: this.auth_agent_id,
            invoice_no: this.invoice_no,
            bill_no: this.bill_no,
            payment_method: this.payment_method,
            discount: this.discount,
            expenses: this.expenses,
            current_amount: this.current_amount,
            cash_amount: this.cash_amount,
            change_amount: this.change_amount,
            total_amount: this.total_amount,
            exe_level: this.exe_level,
            // added_items: this.added_items,
            // return_items: this.return_items
            added_items: this.added_items.map(item => item.toJSON()),
            return_items: this.return_items.map(item => item.toJSON())
        };
    }
}

export class AddedItemDTO {
    // Attributes for added items
    sku;
    qty;
    stock_price;
    retail_price;
    exp_date;
    batch_code;

    constructor({ sku, qty, stock_price, retail_price, exp_date, batch_code }) {
        this.sku = sku;
        this.qty = qty;
        this.stock_price = stock_price;
        this.retail_price = retail_price;
        this.exp_date = exp_date;
        this.batch_code = batch_code;
    }

    toJSON() {
        return {
            sku: this.sku,
            qty: this.qty,
            stock_price: this.stock_price,
            retail_price: this.retail_price,
            exp_date: this.exp_date,
            batch_code: this.batch_code,
        };
    }
}

export class ReturnItemDTO {
    // Attributes for return items
    sku;
    batch_code;
    qty;
    description;

    constructor({ sku, batch_code, qty, description }) {
        this.sku = sku;
        this.batch_code = batch_code;
        this.qty = qty;
        this.description = description;
    }

    toJSON() {
        return {
            sku: this.sku,
            batch_code: this.batch_code,
            qty: this.qty,
            description: this.description,
        };
    }
}