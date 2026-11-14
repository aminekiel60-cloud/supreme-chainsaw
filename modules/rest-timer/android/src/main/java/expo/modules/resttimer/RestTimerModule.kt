package expo.modules.resttimer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * A silent, ongoing notification that counts down to the end of your rest.
 * Android draws the countdown itself (a chronometer), so it keeps ticking
 * while the app is in the background or the screen is off.
 */
class RestTimerModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("RestTimerNotification")

    Function("show") { endsAtMillis: Double, title: String, body: String ->
      show(endsAtMillis.toLong(), title, body)
    }

    Function("hide") {
      hide()
    }
  }

  private fun manager(ctx: Context) = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun show(endsAt: Long, title: String, body: String) {
    val ctx = context ?: return
    val remaining = endsAt - System.currentTimeMillis()
    if (remaining <= 0) {
      hide()
      return
    }
    val manager = manager(ctx)
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(CHANNEL_ID, "Rest countdown", NotificationManager.IMPORTANCE_LOW)
      channel.description = "Shows how long your rest between sets still lasts"
      channel.setShowBadge(false)
      channel.setSound(null, null)
      channel.enableVibration(false)
      manager.createNotificationChannel(channel)
    }

    // A monochrome icon made for notifications, else the app icon.
    val iconId = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    val smallIcon = if (iconId != 0) iconId else ctx.applicationInfo.icon

    val builder = Notification.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(smallIcon)
      .setContentTitle(title)
      .setContentText(body)
      .setWhen(endsAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setTimeoutAfter(remaining)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .setColor(0xFFA3FF3F.toInt())

    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    if (launch != null) {
      val pending = PendingIntent.getActivity(
        ctx,
        0,
        launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      builder.setContentIntent(pending)
    }

    try {
      manager.notify(NOTIFICATION_ID, builder.build())
    } catch (e: SecurityException) {
      // Notifications not allowed: the in-app timer still works.
    }
  }

  private fun hide() {
    val ctx = context ?: return
    manager(ctx).cancel(NOTIFICATION_ID)
  }

  companion object {
    private const val CHANNEL_ID = "rest-countdown"
    private const val NOTIFICATION_ID = 4711
  }
}
