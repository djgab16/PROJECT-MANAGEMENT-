DELIVERY MANAGEMENT SYSTEM 

3. Functional Requirements
3.1 User Authentication and Access Control
FR-001: User Login
The system shall allow users to log in using their registered Employee ID and password.
Priority: Must Have (High)
Source: Business Requirements

FR-002: User Logout
The system shall allow users to log out of the system securely, revoking session tokens and clearing local cache.
Priority: Must Have (High)
Source: Business Requirements

FR-003: Failed Login Attempt Control
The system shall allow a maximum of three (3) consecutive failed login attempts. Upon reaching the maximum threshold, the associated account shall be temporarily locked for fifteen (15) minutes to prevent unauthorized access.
Priority: Must Have (High)
Source: Business Requirements

FR-004: Role Based Access Control
The system shall assign access levels based on four (4) distinct user roles: Admin (System/Operations Admin), Operations Team (displays as Encoder), Driver, and Client (LZP-001 Lazada Philippines). Clients shall have restricted dashboard views, only seeing their own orders.
Priority: Must Have (High)
Source: Business Requirements

3.2 Delivery Order Management
FR-005: Create Delivery Order
The system shall allow authorized users (Admin and Operations Team) to create new delivery orders or pickup requests within the system.
Priority: Must Have (High)
Source: Business Requirements

FR-006: Auto Generate Reference Number
The system shall automatically generate a unique reference number: a Waybill number (WB-2026-XXXXXX) for standard orders created by staff, or a Pickup Note (PN-2026-XXXXXX) for client-submitted orders.
Priority: Must Have (High)
Source: Business Requirements

FR-007: Input Delivery Details
The system shall allow users to input sender name, recipient name, contact numbers (at least 7 digits), structured address, package description, weight, item count, declared value, expected delivery, and assigned personnel. Corporate clients must input a contact person.
Priority: Must Have (High)
Source: Business Requirements

FR-008: Edit Delivery Order
The system shall allow authorized users to edit delivery order information. The form is locked as read-only once a Driver has marked it as Picked Up or starts transit.
Priority: Must Have (High)
Source: Business Requirements

FR-009: Cancel Delivery Order
The system shall allow authorized users to cancel delivery orders before the package is dispatched to a Driver. Cancelled orders are logged and marked as archived.
Priority: Must Have (High)
Source: Business Requirements

FR-010: Schedule Re-Delivery
The system shall allow the Operations Team to schedule re-delivery attempts for packages marked as a Failed Delivery, and allow Clients to submit rescheduling date requests directly from the public tracking portal.
Priority: Must Have (High)
Source: Business Requirements

3.3 Delivery Tracking and Status Management
FR-011: Delivery Status Tracking
The system shall track and display the current delivery status throughout the logistics pipeline. Recognized status values shall include 15 distinct statuses: Pending, Processing, Assigned, Picked Up, In Transit, Out for Delivery, Delivered, Completed, Failed, Returning, Returned, Cancelled, Preparing, Ready for Pickup, and Pending Approval.
Priority: Must Have (High)
Source: Business Requirements

FR-012: Update Delivery Status
The system shall allow the Driver to update the live delivery status sequentially (Picked Up ➔ In Transit ➔ Out for Delivery ➔ Delivered ➔ Completed) as the package moves through the logistics pipeline, and use QR scanner verification to look up packages.
Priority: Must Have (High)
Source: Business Requirements

FR-013: Record Failed Delivery Reasons
The system shall allow Drivers to select predefined reasons (Customer Not Home, Incorrect Address, Damaged Parcel, Refused by Recipient, Other) and input optional remarks when logging a failed delivery attempt.
Priority: Must Have (High)
Source: Business Requirements

FR-014: Static Location Tagging
The system shall capture the static GPS coordinates of the Driver's device during status updates. When the driver starts transit, live coordinates are watch-tracked and streamed to the database.
Priority: Should Have (Medium)
Source: Business Requirements

FR-015: Delivery History Tracking
The system shall maintain a comprehensive delivery history log. For privacy compliance, employee names are hidden on the public tracking portal timeline but visible to staff.
Priority: Should Have (Medium)
Source: Business Requirements

3.4 Proof of Delivery
FR-016: QR Code Generation
The system shall automatically generate a unique QR code for each delivery order upon creation. The QR code shall encode the waybill number and serve as the primary reference for package identification and verification.
Priority: Must Have (High)
Source: Business Requirements

FR-017: QR Code Scanning for Package Verification
The system shall allow authorized users to scan a package's QR code to retrieve and display the associated shipment details, redirecting the driver to the corresponding delivery detail page.
Priority: Must Have (High)
Source: Business Requirements

FR-018: QR Code Tracking Information Display
Upon a successful QR code scan, the system shall display a summary of the package's real-time tracking information, including current status and status history, to the scanning user.
Priority: Must Have (High)
Source: Business Requirements

3.5 Proof of Delivery 
FR-019: Upload Proof of Delivery
The system shall allow the Driver to upload a photographic Proof of Delivery (POD) image upon successful package handover, serving as visual delivery evidence.
Priority: Must Have (High)
Source: Business Requirements

FR-020: Record POD Details
The system shall record and store the following Proof of Delivery details upon submission: recipient's name ("Received By"), exact date and time of delivery, GPS coordinates, the uploaded POD image, and the user account of the Driver.
Priority: Must Have (High)
Source: Business Requirements

FR-021: Auto Complete Delivery
The system shall transition the delivery status to Delivered, and automatically to Completed, upon successful submission and validation of the Proof of Delivery (POD) by the Driver.
Priority: Must Have (High)
Source: Business Requirements

FR-022: POD Image Validation
The system shall validate that the uploaded POD image is in an acceptable format (JPEG, PNG) and does not exceed file size constraints (maximum 5MB) prior to accepting the submission.
Priority: Must Have (High)
Source: Business Requirements

3.6 Proof of Transaction (POT) 
FR-023: Record Proof of Transaction
The system shall allow the Operations Team to record and attach a Proof of Transaction (POT) document or image for delivery orders that involve payment collection, client sign-off, or other transaction-based handover processes.
Priority: Must Have (High)
Source: Business Requirements

FR-024: Upload POT Documentation
The system shall allow the Operations Team to upload supporting transaction documentation (e.g., official receipts, signed acknowledgment forms, or payment confirmations) and associate them with the corresponding delivery order record.
Priority: Must Have (High)
Source: Business Requirements

FR-025: POT Record Management
The system shall allow the Operations Team to view, manage, and update Proof of Transaction records linked to delivery orders, subject to role-based access restrictions.
Priority: Must Have (High)
Source: Business Requirements

FR-026: POT Audit Trail
The system shall maintain an audit trail for all Proof of Transaction entries, including the date and time of submission, the user account of the Operations Team member who uploaded the documentation, and any subsequent modifications.
Priority: Should Have (Medium)
Source: Business Requirements

3.7 Search and Filtering
FR-027: Search by Waybill Number
The system shall allow authorized users to search delivery records using a waybill or product number as the primary search key.
Priority: Must Have (High)
Source: Business Requirements

FR-028: Filter Delivery Records
The system shall allow authorized users to filter delivery records by date range, area/region, client, driver, status, route, and package type.
Priority: Should Have (Medium)
Source: Business Requirements

FR-029: Public Client Tracking
The system shall provide a public-facing tracking portal that allows Clients to input their specific Waybill Number to view a status timeline (condensed for privacy), driver live map tracking (when in transit), reschedule requests, and client receipt confirmation (requiring last 4 digits of phone verification).
Priority: Must Have (High)
Source: Business Requirements

FR-030: Customer Support Hotline Display
The system shall prominently display customer support contact details (Hotline: +63 (2) 888-SPEED, email: support@speedex.com.ph) on the Public Tracking Portal.
Priority: Should Have (Medium)
Source: Business Requirements

3.8 Reporting and Export
FR-031: Generate Reports
The system shall generate reports such as daily, weekly, monthly, per region, per driver, delayed pickup, completed POD, and archived delivery reports.
Priority: Must Have (High)
Source: Business Requirements

FR-032: Export Reports
The system shall allow authorized users to export generated reports. The UI supports CSV (.csv) exports, while the backend is configured with ClosedXML (.xlsx) and QuestPDF (.pdf) libraries.
Priority: Must Have (High)
Source: Business Requirements

3.9 Notification System
FR-033: System Notifications
The system shall display contextual in-application notifications for successful actions, updates, failures, and notifications polled from the database every 10 seconds.
Priority: Should Have (Medium)
Source: Business Requirements

3.10 Archive Management
FR-034: Auto Archive
The system shall automatically archive delivery records upon reaching terminal statuses (Completed, Cancelled, Returned, or Picked Up for Pickups), saving the timestamp, archiver, and reason.
Priority: Must Have (High)
Source: Business Requirements

FR-035: Restrict Archive Editing
The system shall lock archived records as read-only. Editing is blocked and throws a database exception unless the status is being explicitly restored back to Pending or Assigned.
Priority: Must Have (High)
Source: Business Requirements

3.11 Activity Logging
FR-036: Activity Logs
The system shall log user activities (actions: Create, Update, Assign, POT Upload, POD Upload, Login, Archive, Delete) with timestamps, usernames, roles, and device/IP info.
Priority: Should Have (Medium)
Source: Business Requirements

3.10 Failed Pickup Monitoring
FR-037: Failed Pickup Alert
The system shall display a dashboard monitoring unassigned and failed pickups, highlighting orders overdue by more than two (2) days from the order date.
Priority: Should Have (Medium)
Source: Business Requirements

4. Non-Functional Requirements 
4.1 Performance 
NFR-001: Page Load Time 
The system shall load all pages within three (3) seconds under normal operating conditions. The React dashboard uses parallel data fetching to optimize metrics loading.
Priority: Must Have (High) 
Source: Performance Requirements 

NFR-002: Concurrent Users Support 
The system shall support a minimum of fifty (50) concurrent users without degradation. Database indexes are applied to IsArchived and ArchivedAt fields to optimize query execution.
Priority: Must Have (High) 
Source: Performance Requirements 

NFR-003: Update Processing Speed 
The system shall process and reflect status updates within three (3) seconds. The client executes optimistic UI state updates for immediate responses alongside background polling.
Priority: Must Have (High) 
Source: Performance Requirements 

NFR-004: QR Code Scanning Response Time
The system shall process scans and redirect to details within two (2) seconds by performing package lookups locally in the client state.
Priority: Must Have (High)
Source: Performance Requirements

NFR-005: Image Upload Performance
The system shall complete upload and processing of POD and POT images within five (5) seconds, supported by client-side size restrictions (<= 5MB).
Priority: Must Have (High)
Source: Performance Requirements

4.2 Security 
NFR-006: Role Based Access Control Enforcement 
The system shall enforce session validation across endpoints using JWT session tokens, verified in the client ProtectedRoute wrappers.
Priority: Must Have (High) 
Source: Security Requirements 

NFR-007: Password Protection 
The system shall store all user passwords using industry-standard secure hashing algorithms (specifically salt-verified BCrypt).
Priority: Must Have (High) 
Source: Security Requirements 

NFR-008: Secure Communication 
The system shall enforce HTTPS protocol for all client-server communications.
Priority: Must Have (High) 
Source: Security Requirements 

NFR-009: Data Privacy Compliance 
The system shall comply with the Data Privacy Act of 2012 (RA 10173). It hides names from public tracking views, and runs a data retention background cleanup task (purges notifications after 1 year, activity logs after 7 years, and GPS records after 90 days).
Priority: Must Have (High) 
Source: Security Requirements 

NFR-010: Transaction Data Security
The system shall restrict visibility and modification of POT records to authorized roles.
Priority: Must Have (High)
Source: Security Requirements

NFR-011: Uploaded File Security
The system shall validate uploaded files for type and size (maximum 5MB JPEG/PNG) to prevent malicious upload executions.
Priority: Must Have (High)
Source: Security Requirements

4.3 Usability 
NFR-012: User Friendly Interface 
The system shall provide a simple, intuitive, and responsive user interface, optimized for mobile drivers and public client devices.
Priority: Must Have (High)
Source: Usability Requirements 

NFR-013: System Response Time 
The system shall display clear and descriptive feedback messages, integrating toast notifications for couriers.
Priority: Must Have (High) 
Source: Usability Requirements 

NFR-014: Browser Accessibility 
The system shall be accessible and fully functional through all modern web browsers.
Priority: Must Have (High) 
Source: Usability Requirements 

4.4 Reliability 
NFR-015: Data Integrity 
The system shall ensure the accuracy, consistency, and integrity of all stored data at all times.
Priority: Must Have (High) 
Source: Reliability Requirements 

NFR-016: Duplicate Prevention 
The system shall enforce uniqueness constraints to prevent duplicate waybill numbers.
Priority: Must Have (High) 
Source: Reliability Requirements 

NFR-017: Backup Mechanism 
The system shall implement scheduled automated backup mechanisms.
Priority: Must Have (High) 
Source: Reliability Requirements 

NFR-018: Tracking Data Accuracy
The system shall ensure that delivery status updates, GPS location tags, and timestamp records accurately reflect the actual time and conditions at capture, with no retroactive edits allowed.
Priority: Must Have (High)
Source: Reliability Requirements

4.5 Availability 
NFR-019: System Uptime 
The system shall maintain a minimum uptime of ninety-five percent (95%) on a monthly basis.
Priority: Must Have (High) 
Source: Availability Requirements 

NFR-020: Operational Availability 
The system shall be accessible and operational during business operating hours.
Priority: Must Have (High) 
Source: Availability Requirements 

4.6 Scalability 
NFR-021: System Scalability 
The system architecture shall support future feature enhancements without structural changes.
Priority: Should Have (Medium) 
Source: Scalability Requirements 

NFR-022: Load Handling 
The system shall handle increasing delivery volumes while maintaining performance.
Priority: Must Have (High) 
Source: Scalability Requirements 

Noted by: 
__________________  
Mr. Cristian O. Balatbat  
Capstone Adviser
