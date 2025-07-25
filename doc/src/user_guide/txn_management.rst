.. _transactionmgt:

*********************
Managing Transactions
*********************

A database transaction is a grouping of SQL statements that make a logical
data change to the database. When the :meth:`connection.execute()` and
:meth:`connection.executeMany()` methods execute SQL statements such as INSERT
or UPDATE, a transaction is started or continued. By default,
`Data Manipulation Language (DML) <https://www.oracle.com/pls/topic/lookup?ctx
=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements such as
INSERT, UPDATE, and DELETE are not committed. You can explicitly commit or
roll back the transaction using the :meth:`connection.commit()` and
:meth:`connection.rollback()` methods. For example, to commit a new row:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });
    const result = await connection.execute(
        `INSERT INTO mytable (name) VALUES ('John')`);
    connection.commit();

When a connection is released, any ongoing transaction will be rolled
back. Therefore if a released, pooled connection is re-used by a
subsequent :meth:`pool.getConnection()` call (or
:meth:`oracledb.getConnection()` call that uses a
pool), then any DML statements performed on the obtained connection are
always in a new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

When `Data Definition Language (DDL) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-FD9A8CB4-6B9A-44E5-B114-EFB8DA76FC88>`__
statements such as CREATE are executed, Oracle Database will always perform a
commit.

.. _autocommit:

Autocommitting Transactions
===========================

An alternative way to commit is to set the :attr:`oracledb.autoCommit`
property to *true*. With this setting, a commit occurs at the end of each
:meth:`connection.execute()` or :meth:`connection.executeMany()` call. Unlike
an explicit :meth:`connection.commit()` call, this does not require an
additional :ref:`round-trip <roundtrips>` to the database, so it is more
efficient when used appropriately. For example:

.. code-block:: javascript

    oracledb.autocommit = true;

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });
    const result = await connection.execute(
        `INSERT INTO mytable (name) VALUES ('John')`);

For maximum efficiency, set :attr:`~oracledb.autoCommit` to *true* for the
last :meth:`~connection.execute()` or :meth:`~connection.executeMany()` call
of a transaction in preference to using an additional, explicit
:meth:`connection.commit()` call.

When :meth:`connection.executeMany()` is used with the
:ref:`batchErrors <executemanyoptbatcherrors>` option, then the
:attr:`oracledb.autoCommit` property will be ignored if there are data errors.
See :ref:`Handling Data Errors <handlingbatcherrors>`.

.. warning::

    Overuse of the autocommit property can impact database performance. It can
    also destroy relational data consistency when related changes made to
    multiple tables are committed independently, causing table data to be out
    of sync.

Note that irrespective of the :attr:`~oracledb.autoCommit` value, Oracle
Database will always commit an open transaction when a `DDL
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD9A8CB4-
6B9A-44E5-B114-EFB8DA76FC88>`__ statement is executed.

.. _distributedtxns:

Distributed Transactions
========================

For information on distributed transactions, see the chapter :ref:`twopc`.

.. _sessionlesstxns:

Sessionless Transactions
========================

A Sessionless Transaction is a transaction that can be suspended and resumed
during its lifecycle. It breaks the coupling between transactions and
connections, that is, a transaction is no longer tied to a specific
connection. This enables connections to be released for use by other users
while a transaction remains open and can be resumed later. With Sessionless
Transactions, you do not need to use a separate transaction manager since
Oracle Database manages coordination of transactions.

Sessionless Transactions are available from Oracle Database 23ai, Version
23.6 onwards. They are supported in both node-oracledb Thin and
:ref:`Thick <enablingthick>` modes. For node-oracledb Thick mode, Oracle
Client 23ai, Version 23.6 (or later) is additionally required. Also,
Sessionless Transactions require Node.js 14.17 or later.

Each sessionless transaction is identified by a unique transaction identifier.
This can either be user-chosen or generated by node-oracledb.

Sessionless Transactions are ideal for interactive applications with user
"think time". If one user starts a database transaction and then does not
perform database operations for some time (that is the "think time"), the
transaction can be suspended and the database connection can be released
and used by another user. When the first user is ready to continue work, a
database connection can be obtained and their transaction resumed. Without
Sessionless Transactions, both users would need their own connections for the
entire duration of their interaction with the system, including during any
think time.

With node-oracledb, you can:

- Start a sessionless transaction on a database connection by specifying a
  unique transaction identifier
- Perform database operations in the transaction
- Suspend the transaction from the connection after the database operations
  are completed
- Resume the transaction on the same or different connection using the same
  transaction identifier
- Commit or roll back the transaction on the same connection or on a different
  connection if the transaction has been suspended by the previous connection

.. _sessionlesstxnswithrac:

You can use Sessionless Transactions on all Oracle Databases including with
`Oracle Real Application Clusters (RAC) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-D04AA2A7-2E68-4C5C-BD6E-36C62427B98E>`__. For RAC
databases, you can start and suspend a sessionless transaction on one RAC
database instance and resume it on another RAC database instance. To commit or
rollback a sessionless transaction, it must be active on only one of the RAC
instances. If multiple RAC instances have this sessionless transaction active,
the database server waits for the `DISTRIBUTED_LOCK_TIMEOUT
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-AF535DC1-E45B-
412D-95F2-5B6C1F18415D>`__ time to allow other instances to suspend this
transaction before proceeding with a commit or rollback.

Note that there are some constraints when using Sessionless Transactions.
You cannot rollback to a savepoint of the sessionless transaction in a
previous connection. Sessionless Transactions cannot be promoted to
:ref:`distributedtxns`. Session states such as all parameters set by
ALTER SESSION, temporary LOB states, and PL/SQL states are not carried over to
the new connection. For more information on other constraints, see
`Restrictions for Sessionless Transactions <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-7F76D67C-4470-4DA3-BAAE-8E243D9FA87B>`__.

For more information on Sessionless Transactions, see `Developing Applications
with Sessionless Transactions <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-C1F67D04-CE72-416E-8CED-243E5710E83D>`__ in the Oracle
Database Development Guide.

.. _starttxns:

Starting Sessionless Transactions
---------------------------------

To start a sessionless transaction, use
:meth:`connection.beginSessionlessTransaction()`, for example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });
    const txnId = "sessionlessTxnId";
    await connection.beginSessionlessTransaction({transactionId: txnId, timeout: 5,
          deferRoundTrip: true});

You can pass the following parameters to
:meth:`connection.beginSessionlessTransaction()`:

- ``transactionId``: This parameter is the unique identifier of the
  transaction which is used to manage the transaction from start to end. If
  you do not specify the ``transactionId`` value, a unique `universally-unique
  identifier (UUID) <https://www.rfc-editor.org/rfc/rfc4122.txt>`__ is
  generated and returned by
  :meth:`~Connection.beginSessionlessTransaction`. An example is
  "36b8f84d-df4e-4d49-b662-bcde71a8764f".

- ``timeout``: This parameter determines the duration before which this
  transaction can be resumed by a connection the next time that it is
  suspended. The default value is *60* seconds. If the transaction is not
  resumed within the specified duration, the transaction will be rolled back.

- ``deferRoundTrip``: This parameter determines whether the request to start
  a sessionless transaction should be sent immediately or with the next
  database operation. The default value is *False*, that is, the request is
  sent immediately. When set to *True*, the request is sent with the next
  database operation which reduces the number of
  :ref:`round-trips <roundtrips>` to the database.

Once a transaction has been started, all SQL statements are executed as a part
of it.

A sessionless transaction is active from the time it is newly started or
resumed to the time it is suspended, committed, or rolled back.

.. _suspendtxns:

Suspending Sessionless Transactions
-----------------------------------

After you execute database operations, an active sessionless transaction can
be explicitly suspended, or optionally can be automatically suspended on the
next database operation if an execute operation completes successfully. This
detaches the transaction from the current connection.

**Explicitly Suspending Transactions**

To explicitly suspend an active transaction, use
:meth:`connection.suspendSessionlessTransaction()`, for example:

.. code-block:: javascript

    await connection.suspendSessionlessTransaction();

This suspends the active transaction. This transaction is no longer tied to
the connection.

**Suspending a Transaction After a Database Operation**

To automatically suspend an active transaction after the next database
operation, set the ``suspendOnSuccess`` property to *true* in
:meth:`connection.execute()` or :meth:`connection.executeMany()`. This
setting suspends the transaction if the executed statement or PL/SQL block
completes successfully. This helps reduce the number of
:ref:`round-trips <roundtrips>` to the database which in turn improves
performance. For example:

.. code-block:: javascript

    const result = await connection.execute(
        `INSERT INTO slt_table (name) VALUES ('John')`, {},
        {suspendOnSuccess: true});

Once the transaction is suspended, further database operations are not part of
that transaction until it is resumed.

If the execute operation throws an exception, then the transaction will not be
suspended.

If there are no active Sessionless Transactions, this property is ignored.

.. _resumetxns:

Resuming Sessionless Transactions
---------------------------------

To resume a suspended sessionless transaction, use
:meth:`connection.resumeSessionlessTransaction()`, for example:

.. code-block:: javascript

    await connection.resumeSessionlessTransaction(transactionId,
          {timeout: 80, deferRoundTrip: true});

The ``transactionId`` parameter must contain an existing transaction
identifier.

You can set the following parameters in
:meth:`connection.resumeSessionlessTransaction()`:

- ``timeout``: This parameter specifies how long this connection should wait
  to resume a sessionless transaction if it is currently in use by another
  connection. In this case, the current connection waits for the transaction
  to be suspended within this timeout period. If the transaction remains in
  use by the other connection after the timeout period, the error
  `ORA-25351 <https://docs.oracle.com/en/error-help/db/ora-25351>`__ is raised.
  If another connection completes the transaction, the error `ORA-24756
  <https://docs.oracle.com/en/error-help/db/ora-24756>`__ is raised. These
  error messages are only thrown for non-RAC instances. For information on
  using Oracle RAC, see :ref:`Sessionless Transactions with Oracle RAC
  <sessionlesstxnswithrac>`.

- ``deferRoundTrip``: This parameter determines whether the request to resume
  a sessionless transaction should be sent immediately or with the next
  database operation. The default value is *false*, that is, the request is
  sent immediately. When set to *true*, the request is sent with the next
  database operation which reduce the number of
  :ref:`round-trips <roundtrips>` to the database.

Once resumed, the transaction is considered to be active and database
operations are part of that transaction.

.. _commitorrollbacktxns:

Committing or Rolling Back Sessionless Transactions
---------------------------------------------------

A new or resumed transaction can be committed using :meth:`connection.commit()`
and rolled back using :meth:`connection.rollback()`.

Once a transaction has been committed or rolled back, it ends, and cannot be
resumed, suspended, or used for additional database operations.

Example of Using Sessionless Transactions
-----------------------------------------

An example of using Sessionless Transactions is:

.. code-block:: javascript

    const connection1 = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });

    // Start a new sessionless txn
    const transactionId = await connection1.beginSessionlessTransaction({timeout: 5});

    // Execute a database operation
    await connection1.execute(`INSERT INTO sessionlessTxnTab VALUES(1,'John')`);

    // Suspend the sessionless transaction
    await connection1.suspendSessionlessTransaction();

    // Close the connection
    await connection1.close();

In the above sample, the transaction is suspended for *5* seconds and can be
resumed by a connection after this duration. In the example below a different
connection resumes the transaction. The same transaction identifier must be
used:

.. code-block:: javascript

    // Start another connection
    const connection2 = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });

    // Resume the existing transaction in another connection
    await connection2.resumeSessionlessTransaction(transactionId, {timeout: 20});

    // Execute another database operation
    await connection2.execute(`INSERT INTO sessionlessTxnTab VALUES(2,'Jane')`);

    connection2.commit();

    result = connection2.execute(`SELECT * FROM sessionlessTxnTab`);
    console.log(result.rows);

This prints the following output (including the rows inserted in the first
code snippet)::

    [ [ 1, 'John' ], [ 2, 'Jane' ]]

.. _viewsessionlesstxns:

Viewing Sessionless Transactions
--------------------------------

The Oracle Database `V$GLOBAL_TRANSACTION <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-85BD524A-FA12-417F-AC12-4863314E0349>`__ view
displays information on the currently active transactions on the database
server.

To view the active transaction in the current connection, you can use the
following query with `NVL() <https://docs.oracle.com/en/database/oracle/oracle
-database/23/sqlrf/NVL.html>`__:

.. code-block:: sql

    SELECT NVL(dbms_transaction.get_transaction_id, 'NULL transactionId')
    FROM dual;

The `GET_TRANSACTION_ID Function <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-5E1C1B63-207F-4587-8259-0CED93EB9643>`__ of the
DBMS_TRANSACTION package returns the transaction identifier that is used in
the current connection.
