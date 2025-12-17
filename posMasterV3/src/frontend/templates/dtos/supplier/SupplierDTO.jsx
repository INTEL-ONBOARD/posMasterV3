export default class SupplierDTO {
    basic_info;
    financial_info;
    payment_info;
    supplier_created_datetime;
    supplier_update_datetime;

    constructor({
        basic_info,
        financial_info,
        payment_info,
        supplier_created_datetime,
        supplier_update_datetime
    }) {
        this.basic_info = basic_info ? new BasicInfoDTO(basic_info) : null;
        this.financial_info = financial_info ? new FinancialInfoDTO(financial_info) : null;
        this.payment_info = payment_info ? new PaymentInfoDTO(payment_info) : null;
        this.supplier_created_datetime = supplier_created_datetime;
        this.supplier_update_datetime = supplier_update_datetime;
    }

    toJSON() {
        return {
            basic_info: this.basic_info ? this.basic_info.toJSON() : null,
            financial_info: this.financial_info ? this.financial_info.toJSON() : null,
            payment_info: this.payment_info ? this.payment_info.toJSON() : null,
            supplier_created_datetime: this.supplier_created_datetime,
            supplier_update_datetime: this.supplier_update_datetime
        };
    }
}

export class BasicInfoDTO {
    id;
    supplier_name;
    contact;
    type;
    supplier_address;
    status;

    constructor({ id, supplier_name, contact, type, supplier_address, status }) {
        this.id = id;
        this.supplier_name = supplier_name;
        this.contact = contact;
        this.type = type;
        this.supplier_address = supplier_address;
        this.status = status;
    }

    toJSON() {
        return {
            id: this.id,
            supplier_name: this.supplier_name,
            contact: this.contact,
            type: this.type,
            supplier_address: this.supplier_address,
            status: this.status
        };
    }
}

export class FinancialInfoDTO {
    current_amount;
    previous_amount;

    constructor({ current_amount, previous_amount }) {
        this.current_amount = current_amount;
        this.previous_amount = previous_amount;
    }

    toJSON() {
        return {
            current_amount: this.current_amount,
            previous_amount: this.previous_amount
        };
    }
}

export class PaymentInfoDTO {
    account_number;
    account_related_bank;
    account_related_branch;
    account_name;
    account_nickName;

    constructor({ account_number, account_related_bank, account_related_branch, account_name, account_nickName }) {
        this.account_number = account_number;
        this.account_related_bank = account_related_bank;
        this.account_related_branch = account_related_branch;
        this.account_name = account_name;
        this.account_nickName = account_nickName;
    }

    toJSON() {
        return {
            account_number: this.account_number,
            account_related_bank: this.account_related_bank,
            account_related_branch: this.account_related_branch,
            account_name: this.account_name,
            account_nickName: this.account_nickName
        };
    }
}
