/**
 * @description Utility class for booking time conversion
 * @author Salesforce
 * @date 2026
 */
public class BookingTimeUtils {

    /**
     * Convert string time to minutes
     * Examples:
     * 09:30 -> 570
     * 2:15 PM -> 855
     */
    public static Integer toMinutes(String timeString) {

        if (String.isBlank(timeString)) {
            return 0;
        }

        String cleanTime = timeString.trim().toUpperCase();

        Boolean isPM = cleanTime.contains('PM');
        Boolean isAM = cleanTime.contains('AM');

        cleanTime = cleanTime.replace('AM', '');
        cleanTime = cleanTime.replace('PM', '');
        cleanTime = cleanTime.trim();

        List<String> parts = cleanTime.split(':');

        Integer hour = Integer.valueOf(parts[0]);
        Integer minute = 0;

        if (parts.size() > 1) {
            minute = Integer.valueOf(parts[1]);
        }

        if (isPM && hour != 12) {
            hour += 12;
        }

        if (isAM && hour == 12) {
            hour = 0;
        }

        return (hour * 60) + minute;
    }

    /**
     * Check overlap between two time ranges
     */
    public static Boolean timesOverlap(
        String start1,
        String end1,
        String start2,
        String end2
    ) {

        Integer s1 = toMinutes(start1);
        Integer e1 = toMinutes(end1);

        Integer s2 = toMinutes(start2);
        Integer e2 = toMinutes(end2);

        return s1 < e2 && s2 < e1;
    }

    /**
     * Compare two times
     * Returns:
     * 0 = equal
     * 1 = time1 > time2
     * -1 = time1 < time2
     */
    public static Integer compareTime(
        String time1,
        String time2
    ) {

        Integer t1 = toMinutes(time1);
        Integer t2 = toMinutes(time2);

        if (t1 == t2) {
            return 0;
        }

        return t1 > t2 ? 1 : -1;
    }

    /**
     * Format time
     */
    public static String formatTime(String timeString) {

        if (String.isBlank(timeString)) {
            return '';
        }

        if (timeString.length() >= 5) {
            return timeString.substring(0, 5);
        }

        return timeString;
    }

    /**
     * Convert Time object to String
     * Example:
     * 09:30
     */
    public static String asString(Time t) {

        if (t == null) {
            return null;
        }

        String hh = String.valueOf(t.hour()).leftPad(2, '0');
        String mm = String.valueOf(t.minute()).leftPad(2, '0');

        return hh + ':' + mm;
    }

    /**
     * Convert Object/String/Time into Time
     * Fixes deployment errors:
     * BookingTimeUtils.asTime(Object)
     */
    public static Time asTime(Object value) {

        if (value == null) {
            return null;
        }

        // Already Time type
        if (value instanceof Time) {
            return (Time)value;
        }

        String strValue = String.valueOf(value);

        if (String.isBlank(strValue)) {
            return null;
        }

        strValue = strValue.trim();

        try {

            List<String> parts = strValue.split(':');

            Integer hh = 0;
            Integer mm = 0;
            Integer ss = 0;

            if (parts.size() > 0) {
                hh = Integer.valueOf(parts[0]);
            }

            if (parts.size() > 1) {
                mm = Integer.valueOf(parts[1]);
            }

            if (parts.size() > 2) {

                String secPart = parts[2];

                // Handle milliseconds
                if (secPart.contains('.')) {
                    secPart = secPart.substringBefore('.');
                }

                ss = Integer.valueOf(secPart);
            }

            return Time.newInstance(hh, mm, ss, 0);

        } catch (Exception e) {

            throw new AuraHandledException(
                'Invalid time format: ' + strValue
            );
        }
    }

    /**
     * Convert Time to milliseconds
     * Replacement for invalid getTime() usage
     */
    public static Long toMillis(Time t) {

        if (t == null) {
            return 0L;
        }

        Long total =
            (t.hour() * 60 * 60 * 1000) +
            (t.minute() * 60 * 1000) +
            (t.second() * 1000) +
            t.millisecond();

        return total;
    }

    /**
     * Compare Time objects directly
     */
    public static Integer compare(Time t1, Time t2) {

        Long m1 = toMillis(t1);
        Long m2 = toMillis(t2);

        if (m1 == m2) {
            return 0;
        }

        return m1 > m2 ? 1 : -1;
    }

    /**
     * Check overlap using Time objects
     */
    public static Boolean timesOverlap(
        Time start1,
        Time end1,
        Time start2,
        Time end2
    ) {

        Long s1 = toMillis(start1);
        Long e1 = toMillis(end1);

        Long s2 = toMillis(start2);
        Long e2 = toMillis(end2);

        return s1 < e2 && s2 < e1;
    }
}