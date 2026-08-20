import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';

class RoleShell extends ConsumerWidget {
  const RoleShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final destinations = <_Destination>[
      const _Destination('/home', 'Home', Icons.home_outlined, Icons.home),
      if (user == null ||
          (user.can('portals:read') &&
              (user.role == 'student' ||
                  user.role == 'parent' ||
                  user.role == 'teacher' ||
                  user.linkedStudentId != null)))
        const _Destination(
          '/student',
          'Students',
          Icons.school_outlined,
          Icons.school,
        ),
      if (user == null || user.can('academics:read'))
        const _Destination(
          '/timetable',
          'Schedule',
          Icons.calendar_month_outlined,
          Icons.calendar_month,
        ),
      if (user == null || user.can('communication:read'))
        const _Destination(
          '/notifications',
          'Updates',
          Icons.notifications_outlined,
          Icons.notifications,
        ),
      const _Destination('/more', 'More', Icons.more_horiz, Icons.more_horiz),
    ];
    final selected = destinations.indexWhere(
      (item) => location.startsWith(item.path),
    );
    final index = selected < 0 ? 0 : selected;
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final title = switch (location) {
      '/home' => 'School ERP',
      '/student' => 'Students',
      '/timetable' => 'Schedule',
      '/notifications' => 'Updates',
      '/notices' => 'Announcements',
      '/assignments' => 'Assignments',
      '/syllabus' => 'Syllabus progress',
      '/attendance' => 'Attendance',
      '/leave' => 'Leave',
      '/library' => 'Library',
      '/transport' => 'Transport',
      '/exams' => 'Exams & results',
      '/admit-cards' => 'Exam admit cards',
      '/admissions' => 'Admissions',
      '/approvals' => 'Approvals',
      '/finance' => 'Finance',
      '/hr' => 'People & payroll',
      '/people' => 'People directory',
      '/operations' => 'Operations',
      '/back-office' => 'Back-office',
      '/administration' => 'Administration',
      '/more' => 'More',
      '/profile' => 'Profile',
      _ =>
        destinations[index].label == 'Home'
            ? 'School ERP'
            : destinations[index].label,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          if (user?.campus != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  user!.campus!.name,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            ),
        ],
      ),
      body: Row(
        children: [
          if (wide)
            NavigationRail(
              selectedIndex: index,
              labelType: NavigationRailLabelType.all,
              destinations: [
                for (final item in destinations)
                  NavigationRailDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.selectedIcon),
                    label: Text(item.label),
                  ),
              ],
              onDestinationSelected: (value) =>
                  context.go(destinations[value].path),
            ),
          Expanded(child: SafeArea(top: false, child: child)),
        ],
      ),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: index,
              destinations: [
                for (final item in destinations)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.selectedIcon),
                    label: item.label,
                  ),
              ],
              onDestinationSelected: (value) =>
                  context.go(destinations[value].path),
            ),
    );
  }
}

class _Destination {
  const _Destination(this.path, this.label, this.icon, this.selectedIcon);
  final String path;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
