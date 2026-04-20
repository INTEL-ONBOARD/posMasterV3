# POSMaster V3 Business Analysis Overview

## 1. Document Purpose

This document provides a business-level understanding of the POSMaster V3 system. It is written for business analysts, product owners, operations stakeholders, and implementation teams who need to understand what the system does, who uses it, and how the major business processes work.

This is not a technical design document. It focuses on business capabilities, user journeys, business data, and operational behavior.

## 2. System Summary

POSMaster V3 is a desktop-based Point of Sale and inventory management system used to run day-to-day retail or outlet operations.

At a business level, the system supports:

- outlet setup and configuration
- user login and controlled access
- inventory master data management
- stock receiving and restocking
- supplier management
- sales processing at the counter
- member/customer credit handling
- pricing and discount management
- transaction history and operational reporting
- user and role administration
- application settings and update handling
- optional cloud synchronization across locations/systems

## 3. Business Objective

The system appears to be designed to centralize retail branch operations in one application so that staff can:

- maintain item and stock records accurately
- process sales quickly
- track purchases and restocking
- manage branches, suppliers, and members
- reduce manual record-keeping
- maintain some continuity even when internet connectivity is unstable
- synchronize business data when cloud connectivity is available

## 4. Intended Business Users

The main business users appear to be:

- Cashier
  - handles day-to-day sales
  - views item availability
  - manages checkout and transaction history

- Inventory / Store Staff
  - manages item records
  - performs restocking
  - monitors stock levels, disposal, and price changes

- Branch / Outlet Manager
  - oversees branch operations
  - reviews transactions, inventory movements, and settings
  - may manage permissions depending on role

- System Administrator / Admin User
  - manages users and roles
  - configures business rules and app settings
  - has broad access across modules

- Business Owner / Operations Team
  - uses the system outputs for operational control, reconciliation, and reporting

## 5. High-Level Functional Scope

The application is organized around five primary business areas visible from the main navigation:

- Notifications
- Inventory
- Sales
- Users
- Settings

These are the core business modules of the system.

## 6. High-Level Business Flow

```text
Initial setup
   ->
User login
   ->
Branch / outlet-based operation
   ->
Inventory setup and stock receiving
   ->
Sales and customer/member handling
   ->
Transaction tracking and operational controls
   ->
Optional cloud sync and software updates
```

## 7. Module Overview

### 7.1 Startup and Initial Setup

The system includes a startup/setup process before normal use begins.

Business purpose:

- define the outlet or branch being used
- define where local configuration files are stored
- prepare the application for operation

Business implication:

- the application is not purely browser-based or centrally hosted
- it is deployed per machine/location and needs initial local configuration

### 7.2 Login and Session Control

The system has a login process and protected areas that require authentication.

Business purpose:

- ensure only authorized staff use the system
- restrict access to sensitive functions
- track active user sessions

Important business behavior:

- only one active session per user appears to be allowed at a time
- if the same user signs in from another device, the previous session can be ended

This is important for control, accountability, and prevention of shared concurrent logins.

### 7.3 Notifications

A notification area is provided as a default landing area inside the dashboard.

Business purpose:

- surface operational messages
- provide awareness of system events, sync state, or alerts

This likely acts as an operational status center rather than a traditional messaging module.

### 7.4 Inventory Management

Inventory is one of the largest functional areas in the system.

Business capabilities identified:

- view inventory
- add item
- restock inventory
- supplier registration
- price changes
- check history
- inventory configuration
- inventory report
- disposed items tracking

Business interpretation:

- the system manages both item master data and actual stock movement
- it supports operational stock intake, price updates, disposal tracking, and historical review

Inventory-related master data includes:

- items
- categories
- units of measurement
- branches
- suppliers
- stock batches

### 7.5 Sales Management

Sales is the second major operational module.

Business capabilities identified:

- sales screen / billing screen
- transaction history
- inventory view from the sales side
- offers and discounts
- sales configuration
- sales reporting area

Business interpretation:

- the system supports POS checkout activities
- users can browse or search stock while selling
- transaction records are stored for later review
- discount programs can be configured and applied
- the sales reporting area exists, but part of it is still under development

Important note:

- the codebase indicates that the sales report section is not yet fully implemented
- therefore, the reporting capability should be treated as partial, not complete

### 7.6 User and Role Management

The system includes a dedicated user management module.

Business capabilities identified:

- manage users
- manage roles

Business purpose:

- create and maintain user accounts
- assign roles
- control which staff members can access which functional areas

Access control appears to be an important business control built into the system.

Examples of likely controlled areas:

- inventory access
- sales access
- user administration access

### 7.7 Settings and Application Control

The settings module manages application-level behavior and user-level preferences.

Business capabilities identified:

- app settings
- user settings
- branch-related selection and configuration
- cloud sync controls
- software update handling
- run-on-startup and window behavior controls

Business interpretation:

- this is the administrative and operational control center of the application
- it combines business settings with device/application behavior

## 8. Core Business Entities

The following business entities are clearly represented in the system:

- Branch
  - a business location or outlet

- User
  - a staff member who logs into the system

- Role / Permission
  - defines what a user is allowed to do

- Item
  - the product or sellable inventory record

- Category
  - grouping/classification of items

- Unit of Measurement
  - measurement standard such as pieces, liters, kilograms

- Stock
  - the available quantity and price details of an item batch

- Supplier
  - vendor providing stock to the business

- Restock
  - inbound stock transaction / goods receiving event

- Sale
  - customer sales transaction

- Return
  - returned sold goods or reversal-related handling

- Member
  - a customer/member account with possible credit or relationship tracking

- Offer / Discount
  - promotional or pricing rule applied to sales

- Payment Method
  - payment mode such as cash, card, or credit

- Disposed Item
  - stock removed from saleable inventory due to expiry, damage, or other reasons

## 9. Key Business Processes

### 9.1 Outlet Setup

Typical process:

1. Open the application for the first time.
2. Select or confirm the configuration folder.
3. Select the outlet/branch.
4. Finalize setup.
5. Proceed to login.

### 9.2 Inventory Creation and Maintenance

Typical process:

1. Define categories, branches, and units of measurement.
2. Add item master records.
3. Assign item details such as SKU and branch relevance.
4. Maintain availability and stock settings.

### 9.3 Stock Receiving / Restocking

Typical process:

1. Select supplier and receiving details.
2. Add incoming items and quantities.
3. capture purchase and retail pricing
4. record batch details and possible expiry data
5. save the restock transaction
6. system updates stock balances

Business value:

- keeps inventory levels current
- creates traceability for stock intake
- supports purchasing and valuation controls

### 9.4 Sales Processing

Typical process:

1. Cashier selects items.
2. Quantities and prices are confirmed.
3. Discounts or offers may apply.
4. Customer/member can be attached when relevant.
5. Payment method is selected.
6. Sale is completed and recorded.
7. Stock balances are reduced.

Business value:

- enables fast checkout
- records commercial transactions
- updates stock and member balances

### 9.5 Member / Customer Credit Handling

The data structures suggest the system supports member-based sales and credit tracking.

Business interpretation:

- members can have profiles
- member purchase value and credit balances can be tracked
- returns may also affect member balances

This means the system is not limited to anonymous retail checkout; it also supports account-based selling.

### 9.6 Returns and Disposal

The system contains return handling and disposed item tracking.

Business purpose:

- reverse or adjust sales/inventory where needed
- account for damaged, expired, or unusable stock
- improve stock accuracy and auditability

### 9.7 User Governance

Typical process:

1. Admin creates a user.
2. Role and permissions are assigned.
3. User accesses only allowed modules.
4. Session behavior is monitored and controlled.

Business value:

- segregation of duties
- reduction of unauthorized access
- improved accountability

## 10. Reporting and Monitoring

The system includes operational reporting and history views, especially around:

- inventory
- stock checks/history
- transaction history
- price changes
- restocking
- disposal

There is also evidence of:

- login/session history
- status notifications
- sync status visibility

Business note:

- some reporting appears mature in inventory operations
- some analytics/reporting in sales are still evolving

## 11. Branch and Multi-Location Context

Branch handling is a recurring concept in the system.

Business implications:

- the system is intended to support more than one outlet or business location
- some records are branch-specific
- users may operate in a selected branch context
- branch-specific stock and transactions are likely part of normal operation

This is important for BA work involving multi-branch requirements, data visibility rules, and reporting scope.

## 12. Cloud Synchronization and Offline Capability

The codebase strongly suggests a local-first system with optional cloud synchronization.

Business interpretation:

- the application can continue operating using local data
- when connectivity is available, data can be synchronized with a remote/cloud environment
- the system appears to monitor online/offline status
- pending changes may be queued until connectivity is restored

Business value:

- suitable for outlets with unstable internet
- reduces business disruption during outages
- supports eventual consolidation of branch or machine-level data

Business caution:

- synchronization rules, ownership, and conflict handling should be clarified further if the BA team is preparing requirements or UAT documents

## 13. Security and Control Features

At a business level, the following controls are visible:

- authenticated access to core areas
- role- and permission-based access control
- single active session enforcement
- user session monitoring
- administrative settings control
- controlled access to user management features

These controls matter for:

- auditability
- fraud reduction
- operational discipline
- compliance with internal business controls

## 14. Integration and External Touchpoints

The system appears to interact with several external or semi-external layers:

- local desktop environment
  - file paths
  - printing
  - startup behavior

- cloud data services
  - for synchronization

- GitHub release/update channel
  - for desktop software updates

From a BA perspective, this means the product is not just a transactional system. It also includes:

- device behavior
- software deployment/update behavior
- connectivity-dependent synchronization behavior

## 15. Known Functional Boundaries and Observations

Based on the current codebase review, these points should be noted:

- the application is desktop-first, not a standard web-only system
- startup includes outlet and local folder setup
- inventory and sales are the strongest completed functional areas
- user and permission management is built in
- cloud sync exists and is operationally important
- software update handling is built into the application
- some sales reporting functionality is still under development

## 16. Suggested BA Requirement Areas for Further Clarification

If this system is being documented for formal business analysis, these areas should be clarified with stakeholders:

- branch operating model
  - can users switch branches
  - are users tied to one branch

- member/customer policy
  - what is the exact role of members
  - how is credit approved and settled

- discount governance
  - who can define and approve offers/discounts

- return rules
  - what return scenarios are allowed
  - how are approvals handled

- disposal governance
  - who can dispose stock
  - what evidence or approval is required

- reporting expectations
  - which reports are mandatory for business operations
  - which reports are still pending

- sync model
  - source of truth
  - conflict handling
  - timing of branch data synchronization

- audit and compliance
  - what logs must be retained
  - what approvals are required for sensitive actions

## 17. Simple Business Capability Map

```text
POSMaster V3
   ->
Setup and branch initialization
   ->
User access and permissions
   ->
Inventory and stock control
   ->
Supplier and restock management
   ->
Sales and member handling
   ->
Transaction history and reporting
   ->
Settings, sync, and updates
```

## 18. Conclusion

POSMaster V3 is a branch-aware desktop retail operations system centered on inventory control and point-of-sale processing. It combines store setup, stock operations, sales, supplier handling, user governance, and operational settings in one application.

For business analysis purposes, the system can be understood as a retail operations platform with local execution, branch-aware data handling, controlled user access, and optional cloud synchronization. The most business-critical areas are inventory, sales, branch operations, user governance, and sync reliability.
