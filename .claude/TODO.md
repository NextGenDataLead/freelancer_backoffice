
- register a POC and a administrative email. The latter is the email to send the invoice to
- Send the invoice
- Change status of invoices with the checkmark in the table: Failed to execute 'json' on 'Response': Unexpected end of JSON input
- When trying to adjust time: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
- the timer option still allows you to change the date, but after running still puts in on todays datw which is what I want, but therefore date should not be an option to choose from. Make sure it overlaps just as the hours are for the timer optino. 
- add back support for pdfs
- It could also be the case that reverse charge is not indicated and/or      │
│   that tax is incorrectly added. That's why you always need to look for a    │
│   Tax number



Test:
- Add a Belgium B2B Klant with mothly invoicing
- Add a Dutch B2C klant with invoiceing on demand
- Add time on 1) yesterday and 2) the last day of previous month for both Klanten
- Run the timer for one Klant
- Check if the factureerbaar amount is currently the amount of the previous month for the Belgian Klant and everything of the Dutch B2C klant
- Create the invoices
- Change 1 invoice and increase the rate by 1000.
- Change the status of the invoices to sent
- Register a domestic expense and a foreign expense to showcase both domestic VAT as well as reverse charge
- Check the BTW and ICP report. I expect the B2C invoice and VAT to be in seciton 1, the B2B invoice reverse charged in section 3 with 0%. The Belgian invoices should also be summed up in the ICP

- Also test faults, incorrect and/or missing input
- Check if the VIES checker works

