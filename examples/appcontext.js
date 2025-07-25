/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   appcontext.js
 *
 * DESCRIPTION
 *   Fetches the application context value set in a connection, given its
 *   namespace and name.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

async function run() {

  let connection;

  try {
    // Get a non-pooled connection

    const APP_CTX_NAMESPACE = 'CLIENTCONTEXT';
    const APP_CTX_ENTRIES = [
      [ APP_CTX_NAMESPACE, 'ATTR1', 'VALUE1' ],
      [ APP_CTX_NAMESPACE, 'ATTR2', 'VALUE2' ],
      [ APP_CTX_NAMESPACE, 'ATTR3', 'VALUE3' ],
    ];
    const config = { ...dbConfig, appContext: APP_CTX_ENTRIES };

    connection = await oracledb.getConnection(config);

    for (const entry of APP_CTX_ENTRIES) {
      const result = await connection.execute(
        // The statement to execute
        `SELECT sys_context(:1, :2) FROM dual`,

        // The "bind value" with namespace and name
        [entry[0], entry[1]]
      );
      console.log('The appcontext value is:', result.rows[0][0]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        // Connections should always be released when not needed
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();
