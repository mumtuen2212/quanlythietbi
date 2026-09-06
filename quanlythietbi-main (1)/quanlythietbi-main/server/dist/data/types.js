"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = exports.ALL_PERMISSIONS = void 0;
exports.ALL_PERMISSIONS = [
    'MANAGE_DEVICES',
    'MANAGE_ROOMS',
    'VIEW_REPORTS',
    'ASSIGN_REPORTS',
    'RESOLVE_REPORTS',
    'GRANT_PERMISSIONS',
    'CREATE_REPORT'
];
exports.DEFAULT_ROLE_PERMISSIONS = {
    ADMIN: [
        'MANAGE_DEVICES',
        'MANAGE_ROOMS',
        'VIEW_REPORTS',
        'ASSIGN_REPORTS',
        'RESOLVE_REPORTS',
        'GRANT_PERMISSIONS',
        'CREATE_REPORT'
    ],
    TECHNICIAN: [
        'MANAGE_DEVICES',
        'VIEW_REPORTS',
        'RESOLVE_REPORTS',
        'CREATE_REPORT'
    ],
    TEACHER: [
        'VIEW_REPORTS',
        'CREATE_REPORT'
    ],
    STUDENT: [
        'CREATE_REPORT'
    ]
};
